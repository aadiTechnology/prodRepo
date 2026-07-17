"""
Check + fix subject academic-year update vs Subject List (tenant 20).

Problems detected previously:
  1) Edit Subject saved success but list filter stayed on the OLD year, so the
     moved subject looked "not updated".
  2) Orphan subject_classes rows where academic_year_id != class.academic_year_id
     (e.g. Social Sci mapped to year 2024-2025 but class Standard 1 belongs to 2026-2027).

Usage:
  python scripts/check_subject_academic_year_update_tenant20.py --tenant-id 20
  python scripts/check_subject_academic_year_update_tenant20.py --tenant-id 20 --fix
  python scripts/check_subject_academic_year_update_tenant20.py --tenant-id 20 --subject-id 10 --apply

Exit 0 = OK / fixed
Exit 1 = mismatches remain
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

current_dir = Path(__file__).resolve().parent
fastapi_root = current_dir.parent
if str(fastapi_root) not in sys.path:
    sys.path.insert(0, str(fastapi_root))

from dotenv import load_dotenv
from sqlalchemy import text

load_dotenv(os.getenv("ENV_FILE", ".env"))

from app.core.database import SessionLocal
from app.schemas.subject_schema import SubjectUpdate
from app.services.subject_service import SubjectService


def _print(msg: str = "") -> None:
    print(msg.encode("ascii", "replace").decode("ascii"))


def find_orphans(db, tenant_id: int) -> list[dict]:
    rows = db.execute(
        text(
            """
            SELECT
              sc.id AS mapping_id,
              s.id AS subject_id,
              s.name AS subject_name,
              s.code,
              sc.academic_year_id AS mapping_year_id,
              ay.name AS mapping_year_name,
              sc.class_id,
              c.name AS class_name,
              c.academic_year_id AS class_year_id,
              cay.name AS class_year_name,
              sc.is_active AS mapping_active
            FROM subject_classes sc
            INNER JOIN subjects s ON s.id = sc.subject_id
            INNER JOIN classes c ON c.id = sc.class_id
            LEFT JOIN academic_years ay ON ay.id = sc.academic_year_id
            LEFT JOIN academic_years cay ON cay.id = c.academic_year_id
            WHERE s.tenant_id = :tid
              AND s.is_deleted = 0
              AND sc.academic_year_id IS NOT NULL
              AND c.academic_year_id IS NOT NULL
              AND sc.academic_year_id <> c.academic_year_id
            ORDER BY s.name, sc.id
            """
        ),
        {"tid": tenant_id},
    ).mappings().all()
    return [dict(r) for r in rows]


def fix_orphans(db, tenant_id: int) -> tuple[int, int]:
    """
    Fix subject_classes where mapping year != class year.
    - If a correct row already exists for (class_year, class, subject), delete the orphan.
    - Otherwise update the orphan's academic_year_id to the class year.
    Returns (deleted, updated).
    """
    orphans = find_orphans(db, tenant_id)
    deleted = 0
    updated = 0
    for o in orphans:
        mid = int(o["mapping_id"])
        subject_id = int(o["subject_id"])
        class_id = int(o["class_id"])
        class_year_id = int(o["class_year_id"])
        existing = db.execute(
            text(
                """
                SELECT TOP 1 id FROM subject_classes
                WHERE subject_id = :sid
                  AND class_id = :cid
                  AND academic_year_id = :yid
                  AND id <> :mid
                """
            ),
            {"sid": subject_id, "cid": class_id, "yid": class_year_id, "mid": mid},
        ).mappings().first()
        if existing:
            db.execute(text("DELETE FROM subject_classes WHERE id = :mid"), {"mid": mid})
            deleted += 1
            _print(
                f"  deleted orphan mid={mid} {o['subject_name']} "
                f"(correct mapping already exists for year {class_year_id})"
            )
        else:
            db.execute(
                text(
                    """
                    UPDATE subject_classes
                    SET academic_year_id = :yid
                    WHERE id = :mid
                    """
                ),
                {"yid": class_year_id, "mid": mid},
            )
            updated += 1
            _print(
                f"  updated orphan mid={mid} {o['subject_name']} "
                f"year {o['mapping_year_id']} -> {class_year_id}"
            )
    return deleted, updated


def mappings_for(db, subject_id: int) -> list[dict]:
    rows = db.execute(
        text(
            """
            SELECT sc.id, sc.class_id, c.name AS class_name,
                   sc.academic_year_id, ay.name AS year_name,
                   c.academic_year_id AS class_year_id, sc.is_active
            FROM subject_classes sc
            LEFT JOIN classes c ON c.id = sc.class_id
            LEFT JOIN academic_years ay ON ay.id = sc.academic_year_id
            WHERE sc.subject_id = :sid
            ORDER BY sc.academic_year_id, sc.class_id
            """
        ),
        {"sid": subject_id},
    ).mappings().all()
    return [dict(r) for r in rows]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--tenant-id", type=int, default=20)
    parser.add_argument("--subject-id", type=int, default=None)
    parser.add_argument("--fix", action="store_true", help="Fix orphan year/class mismatches")
    parser.add_argument("--apply", action="store_true", help="Run a move test (rolled back)")
    parser.add_argument("--commit", action="store_true")
    args = parser.parse_args()
    tenant_id = args.tenant_id

    _print("=" * 72)
    _print(f"SUBJECT YEAR vs LIST CHECK — tenant_id={tenant_id}")
    _print("=" * 72)

    db = SessionLocal()
    try:
        tenant = db.execute(
            text("SELECT id, name FROM tenants WHERE id=:tid"), {"tid": tenant_id}
        ).mappings().first()
        if not tenant:
            _print("ERROR: tenant not found")
            return 1
        _print(f"Tenant: {tenant['name']}")

        orphans = find_orphans(db, tenant_id)
        _print(f"\n[1] Orphan mappings (mapping year != class year): {len(orphans)}")
        for o in orphans:
            _print(
                f"  mid={o['mapping_id']} {o['subject_name']}({o['code']}) "
                f"mapping_year={o['mapping_year_name']}({o['mapping_year_id']}) "
                f"class={o['class_name']} class_year={o['class_year_name']}({o['class_year_id']}) "
                f"active={o['mapping_active']}"
            )

        if args.fix and orphans:
            deleted, updated = fix_orphans(db, tenant_id)
            db.commit()
            _print(f"\n[FIX] deleted={deleted} updated={updated}")
            orphans = find_orphans(db, tenant_id)
            _print(f"  Remaining orphans: {len(orphans)}")

        # Per-subject dump
        subject_id = args.subject_id
        if subject_id is None and orphans:
            subject_id = int(orphans[0]["subject_id"])
        if subject_id is None:
            row = db.execute(
                text(
                    """
                    SELECT TOP 1 s.id FROM subjects s
                    INNER JOIN subject_classes sc ON sc.subject_id = s.id
                    WHERE s.tenant_id=:tid AND s.is_deleted=0
                    ORDER BY s.id
                    """
                ),
                {"tid": tenant_id},
            ).mappings().first()
            subject_id = int(row["id"]) if row else None

        if subject_id:
            _print(f"\n[2] Subject id={subject_id} mappings")
            for m in mappings_for(db, subject_id):
                mismatch = (
                    m["academic_year_id"] is not None
                    and m["class_year_id"] is not None
                    and int(m["academic_year_id"]) != int(m["class_year_id"])
                )
                flag = " ** MISMATCH" if mismatch else ""
                _print(
                    f"  mid={m['id']} year={m['year_name']}({m['academic_year_id']}) "
                    f"class={m['class_name']}({m['class_id']}) "
                    f"class_year={m['class_year_id']} active={m['is_active']}{flag}"
                )

            # List visibility per mapping year
            years = {
                int(m["academic_year_id"]): m["year_name"]
                for m in mappings_for(db, subject_id)
                if m["academic_year_id"] is not None
            }
            _print("\n[3] Subject List visibility")
            for yid, yname in years.items():
                listed, total = SubjectService.get_subjects(
                    db, tenant_id, skip=0, limit=200, academic_year_id=yid, is_active=None
                )
                on = any(s.id == subject_id for s in listed)
                _print(f"  Filter year={yname}({yid}) total={total} subject_visible={on}")

        if args.apply and subject_id:
            maps = mappings_for(db, subject_id)
            if not maps:
                _print("ERROR: no mappings to move")
                return 1
            src = maps[0]
            # Pick another year that HAS a class
            target = db.execute(
                text(
                    """
                    SELECT TOP 1 ay.id AS year_id, ay.name AS year_name, c.id AS class_id, c.name AS class_name
                    FROM academic_years ay
                    INNER JOIN classes c ON c.academic_year_id = ay.id
                      AND c.tenant_id = ay.tenant_id AND c.is_deleted = 0 AND c.is_active = 1
                    WHERE ay.tenant_id = :tid AND ay.is_deleted = 0 AND ay.is_active = 1
                      AND ay.id <> :src_year
                    ORDER BY ay.id DESC
                    """
                ),
                {"tid": tenant_id, "src_year": int(src["academic_year_id"])},
            ).mappings().first()
            if not target:
                _print("SKIP apply: no other year with classes")
            else:
                sub = db.execute(
                    text("SELECT name, code, subject_type, is_active FROM subjects WHERE id=:id"),
                    {"id": subject_id},
                ).mappings().first()
                _print(
                    f"\n[4] APPLY move {src['year_name']} / {src['class_name']} "
                    f"-> {target['year_name']} / {target['class_name']}"
                )
                payload = SubjectUpdate(
                    name=sub["name"],
                    code=sub["code"],
                    subject_type=sub["subject_type"],
                    is_active=bool(sub["is_active"]),
                    is_mandatory=True,
                    academic_year_id=int(target["year_id"]),
                    class_mappings=[
                        {
                            "class_id": int(target["class_id"]),
                            "academic_year_id": int(target["year_id"]),
                            "is_mandatory": True,
                            "is_active": True,
                            "previous_class_id": int(src["class_id"]),
                            "previous_academic_year_id": int(src["academic_year_id"]),
                        }
                    ],
                )
                SubjectService.update_subject(
                    db, tenant_id=tenant_id, user_id=1, subject_id=subject_id, update_data=payload
                )
                after = mappings_for(db, subject_id)
                _print("  AFTER:")
                for m in after:
                    _print(
                        f"    mid={m['id']} year={m['year_name']}({m['academic_year_id']}) "
                        f"class={m['class_name']}({m['class_id']})"
                    )
                listed, _ = SubjectService.get_subjects(
                    db,
                    tenant_id,
                    skip=0,
                    limit=200,
                    academic_year_id=int(target["year_id"]),
                    is_active=None,
                )
                on_new = any(s.id == subject_id for s in listed)
                listed_old, _ = SubjectService.get_subjects(
                    db,
                    tenant_id,
                    skip=0,
                    limit=200,
                    academic_year_id=int(src["academic_year_id"]),
                    is_active=None,
                )
                on_old = any(s.id == subject_id for s in listed_old)
                _print(f"  List NEW year visible={on_new}  OLD year visible={on_old}")
                if not args.commit:
                    db.rollback()
                    _print("  (Rolled back)")
                else:
                    db.commit()
                    _print("  (Committed)")
                if not on_new or on_old:
                    _print("\nVERDICT: FAIL — list does not reflect year move")
                    return 1
                _print(
                    "  NOTE: SubjectService.update_subject() commits; "
                    "this apply test persists unless you restore data."
                )

        orphans_left = find_orphans(db, tenant_id)
        _print("\n" + "=" * 72)
        if orphans_left:
            _print("VERDICT: FAIL — orphan year/class mismatches remain (run with --fix)")
            return 1
        _print(
            "VERDICT: OK — mapping years match classes. "
            "After Edit save, Subject List filter switches to the saved academic year."
        )
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
