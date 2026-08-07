"""
Audit (and optionally fix) teacher class assignment gaps that break Syllabus Add.

Symptom:
  Teacher Add Syllabus shows blank Class + "Not authorized for this class"
  (e.g. Namita) while another teacher works (e.g. Sakshi / "Sakhi").

Cause:
  Syllabus / homework scope reads dbo.teacher_assignments.
  Some teachers only have legacy teachers.class_id / class_division_id and
  zero rows in teacher_assignments.

This script:
  1. Lists every active teacher and whether syllabus filter/create scope works.
  2. With --fix, backfills missing teacher_assignments from legacy teachers.class_id
     (class-teacher style: subject_id NULL) for the current academic year.

Usage (from apps/fastapi, with venv):
    python scripts/check_fix_teacher_syllabus_assignments.py
    python scripts/check_fix_teacher_syllabus_assignments.py --tenant-id 22
    python scripts/check_fix_teacher_syllabus_assignments.py --tenant-id 22 --fix

Exit 0 = all teachers OK (or fixed); 1 = broken teachers remain.
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

fastapi_root = Path(__file__).resolve().parents[1]
if str(fastapi_root) not in sys.path:
    sys.path.insert(0, str(fastapi_root))

from dotenv import load_dotenv

load_dotenv(os.getenv("ENV_FILE", str(fastapi_root / ".env")))

from sqlalchemy import text

from app.core.database import SessionLocal
from app.core.exceptions import ForbiddenException
from app.services import syllabus_service


def _print(msg: str = "") -> None:
    print(msg.encode("ascii", "replace").decode("ascii"))


def _current_academic_year_id(db, tenant_id: int) -> int | None:
    row = db.execute(
        text(
            """
            SELECT TOP 1 id
            FROM academic_years
            WHERE tenant_id = :tenant_id
              AND is_deleted = 0
            ORDER BY
              CASE WHEN is_current = 1 THEN 0 ELSE 1 END,
              CASE WHEN is_active = 1 THEN 0 ELSE 1 END,
              id DESC
            """
        ),
        {"tenant_id": tenant_id},
    ).first()
    return int(row[0]) if row else None


def _list_teachers(db, tenant_id: int | None):
    sql = """
        SELECT
            u.id AS user_id,
            u.full_name,
            u.email,
            u.role,
            u.tenant_id,
            t.id AS teacher_id,
            t.class_id AS legacy_class_id,
            t.class_division_id AS legacy_division_id,
            lc.name AS legacy_class_name,
            (
                SELECT COUNT(*)
                FROM teacher_assignments ta
                WHERE ta.teacher_id = t.id
                  AND ta.tenant_id = t.tenant_id
                  AND ta.is_active = 1
            ) AS active_assignments
        FROM dbo.users u
        INNER JOIN dbo.teachers t
            ON t.user_id = u.id
           AND t.tenant_id = u.tenant_id
           AND t.is_deleted = 0
           AND t.is_active = 1
        LEFT JOIN dbo.classes lc
            ON lc.id = t.class_id
        WHERE u.is_active = 1
          AND (:tenant_id IS NULL OR u.tenant_id = :tenant_id)
        ORDER BY u.tenant_id, u.full_name
    """
    return db.execute(text(sql), {"tenant_id": tenant_id}).mappings().all()


def _backfill_assignment(
    db,
    *,
    tenant_id: int,
    teacher_id: int,
    class_id: int,
    class_division_id: int | None,
    academic_year_id: int,
) -> str:
    exists = db.execute(
        text(
            """
            SELECT TOP 1 id
            FROM teacher_assignments
            WHERE tenant_id = :tenant_id
              AND teacher_id = :teacher_id
              AND class_id = :class_id
              AND (
                    (:div_id IS NULL AND class_division_id IS NULL)
                 OR class_division_id = :div_id
              )
              AND subject_id IS NULL
              AND is_active = 1
            """
        ),
        {
            "tenant_id": tenant_id,
            "teacher_id": teacher_id,
            "class_id": class_id,
            "div_id": class_division_id,
        },
    ).first()
    if exists:
        return "already_exists"

    db.execute(
        text(
            """
            INSERT INTO teacher_assignments (
                tenant_id,
                academic_year_id,
                class_id,
                class_division_id,
                teacher_id,
                subject_id,
                is_active,
                created_at,
                updated_at
            )
            VALUES (
                :tenant_id,
                :academic_year_id,
                :class_id,
                :class_division_id,
                :teacher_id,
                NULL,
                1,
                GETDATE(),
                GETDATE()
            )
            """
        ),
        {
            "tenant_id": tenant_id,
            "academic_year_id": academic_year_id,
            "class_id": class_id,
            "class_division_id": class_division_id,
            "teacher_id": teacher_id,
        },
    )
    return "inserted"


def audit_and_fix(*, tenant_id: int | None, apply_fix: bool) -> int:
    db = SessionLocal()
    broken = 0
    fixed = 0
    ok = 0
    skipped = 0

    try:
        teachers = _list_teachers(db, tenant_id)
        if not teachers:
            _print("No active teachers found.")
            return 1

        _print(
            f"Checking {len(teachers)} teacher(s)"
            + (f" in tenant {tenant_id}" if tenant_id is not None else " (all tenants)")
            + (" [FIX MODE]" if apply_fix else " [audit only]")
        )
        _print()

        year_cache: dict[int, int | None] = {}

        for row in teachers:
            tid = int(row["tenant_id"])
            name = row["full_name"] or "?"
            user_id = int(row["user_id"])
            teacher_id = int(row["teacher_id"])
            legacy_class = row["legacy_class_id"]
            legacy_div = row["legacy_division_id"]
            asg_count = int(row["active_assignments"] or 0)

            ctx = syllabus_service.get_viewer_context(
                db,
                tenant_id=tid,
                user_id=user_id,
                email=str(row["email"] or ""),
                legacy_role=row["role"],
            )
            opts = syllabus_service.get_filter_options(
                db,
                tenant_id=tid,
                user_id=user_id,
                viewer_context=ctx,
            )
            class_names = [c.name for c in opts.classes]
            scope_ok = len(opts.classes) > 0

            create_ok = False
            create_err = ""
            if scope_ok:
                try:
                    # Dry authorization check only — do not persist.
                    syllabus_service._assert_class_in_scope(  # noqa: SLF001
                        class_id=int(opts.classes[0].id),
                        viewer_context=ctx,
                    )
                    create_ok = True
                except ForbiddenException as exc:
                    create_err = str(exc)
                except Exception as exc:  # noqa: BLE001
                    create_err = f"{type(exc).__name__}: {exc}"

            status = "OK" if scope_ok and create_ok else "BROKEN"
            needs_backfill = asg_count == 0 and legacy_class is not None

            if status == "OK" and not needs_backfill:
                ok += 1
            elif status == "BROKEN":
                broken += 1
            else:
                # Runtime OK via legacy fallback, but assignments table still empty.
                ok += 1

            label = status
            if needs_backfill and status == "OK":
                label = "OK_NEEDS_BACKFILL"

            _print(
                f"[{label}] tenant={tid} {name} (user={user_id}, teacher={teacher_id}) "
                f"assignments={asg_count} "
                f"legacy_class={row['legacy_class_name'] or legacy_class} "
                f"filter_classes={class_names or '-'}"
                + (f" create_err={create_err}" if create_err else "")
            )

            if status == "BROKEN" and not apply_fix:
                if legacy_class:
                    _print(
                        "         -> would backfill teacher_assignments from legacy "
                        f"class_id={legacy_class} div={legacy_div}"
                    )
                else:
                    _print(
                        "         -> no legacy class_id; assign class in Teacher Assignments UI"
                    )
                continue

            if not needs_backfill:
                continue

            if not apply_fix:
                _print(
                    "         -> would backfill teacher_assignments from legacy "
                    f"class_id={legacy_class} div={legacy_div}"
                )
                continue

            if tid not in year_cache:
                year_cache[tid] = _current_academic_year_id(db, tid)
            year_id = year_cache[tid]
            if not year_id:
                skipped += 1
                _print("         -> SKIP fix (no academic year for tenant)")
                continue

            result = _backfill_assignment(
                db,
                tenant_id=tid,
                teacher_id=teacher_id,
                class_id=int(legacy_class),
                class_division_id=int(legacy_div) if legacy_div is not None else None,
                academic_year_id=int(year_id),
            )
            if result == "inserted":
                fixed += 1
                _print(
                    f"         -> FIXED inserted assignment "
                    f"class_id={legacy_class} year={year_id}"
                )
            else:
                _print(f"         -> {result}")

        if apply_fix and fixed:
            db.commit()
        elif apply_fix:
            db.rollback()

        # Re-check after fix
        if apply_fix and fixed:
            _print()
            _print("--- re-check after fix ---")
            still_broken = 0
            still_needs = 0
            for row in _list_teachers(db, tenant_id):
                ctx = syllabus_service.get_viewer_context(
                    db,
                    tenant_id=int(row["tenant_id"]),
                    user_id=int(row["user_id"]),
                    email=str(row["email"] or ""),
                    legacy_role=row["role"],
                )
                opts = syllabus_service.get_filter_options(
                    db,
                    tenant_id=int(row["tenant_id"]),
                    user_id=int(row["user_id"]),
                    viewer_context=ctx,
                )
                asg = int(row["active_assignments"] or 0)
                # recount after commit
                asg = db.execute(
                    text(
                        """
                        SELECT COUNT(*) FROM teacher_assignments
                        WHERE teacher_id = :tid AND tenant_id = :tenant AND is_active = 1
                        """
                    ),
                    {"tid": int(row["teacher_id"]), "tenant": int(row["tenant_id"])},
                ).scalar()
                if not opts.classes:
                    still_broken += 1
                    _print(f"[STILL BROKEN] {row['full_name']} (user={row['user_id']})")
                elif int(asg or 0) == 0 and row["legacy_class_id"]:
                    still_needs += 1
                    _print(f"[STILL NEEDS BACKFILL] {row['full_name']}")
                else:
                    _print(
                        f"[OK] {row['full_name']} assignments={asg} "
                        f"classes={[c.name for c in opts.classes]}"
                    )
            broken = still_broken
            ok = len(teachers) - still_broken

        _print()
        _print(
            f"Summary: ok={ok} broken={broken} fixed={fixed} skipped={skipped} "
            f"total={len(teachers)}"
        )
        return 0 if broken == 0 else 1
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tenant-id", type=int, default=None, help="Limit to one tenant")
    parser.add_argument(
        "--fix",
        action="store_true",
        help="Backfill teacher_assignments from legacy teachers.class_id",
    )
    args = parser.parse_args()
    _print("=== Teacher syllabus class assignment check ===")
    return audit_and_fix(tenant_id=args.tenant_id, apply_fix=args.fix)


if __name__ == "__main__":
    raise SystemExit(main())
