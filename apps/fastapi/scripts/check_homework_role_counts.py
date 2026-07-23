"""
Role-wise Homework unread counts (sidebar badge).

Shows what each user type should see instantly on login:

  - Tenant admin / admin : all unread Active HW in tenant (current academic year)
  - Class teacher        : all subjects for their assigned class/division(s)
  - Subject teacher      : only their assigned subject(s)
  - Student / parent     : only their class/division

Also prints the "bug diff":
  unread WITHOUT year filter  vs  unread WITH current year
  (old sidebar called unread-count with no year until Homework list opened)

Usage (from apps/fastapi):
    python scripts/check_homework_role_counts.py
    python scripts/check_homework_role_counts.py --tenant-id 20
    python scripts/check_homework_role_counts.py --tenant-id 20 --user "Gayatri"
    python scripts/check_homework_role_counts.py --tenant-id 20 --user "Shant"

Exit 0 = counts printed; 1 = no users / DB error.
"""
from __future__ import annotations

import argparse
import os
import sys
from typing import Any, Optional

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from dotenv import load_dotenv

load_dotenv(os.getenv("ENV_FILE", ".env"))

from sqlalchemy import text

from app.core.database import SessionLocal
from app.repositories import homework_repository as hw_repo
from app.services.homework_access import resolve_homework_viewer_context
from app.services.homework_service import resolve_current_academic_year_id


def _print(msg: str = "") -> None:
    print(msg.encode("ascii", "replace").decode("ascii"))


def _resolve_users(db, *, tenant_id: int, name_like: Optional[str]) -> list[dict[str, Any]]:
    sql = """
        SELECT TOP 40
            u.id AS user_id,
            u.full_name,
            u.email,
            u.role,
            u.tenant_id,
            t.id AS teacher_id,
            t.full_name AS teacher_name
        FROM dbo.users u
        LEFT JOIN dbo.teachers t
            ON t.user_id = u.id AND t.tenant_id = u.tenant_id AND t.is_deleted = 0
        WHERE u.tenant_id = :tenant_id
          AND u.is_active = 1
          AND (:name IS NULL OR u.full_name LIKE :name OR t.full_name LIKE :name)
        ORDER BY
            CASE
                WHEN LOWER(CAST(u.role AS NVARCHAR(50))) LIKE '%admin%' THEN 0
                WHEN t.id IS NOT NULL THEN 1
                WHEN LOWER(CAST(u.role AS NVARCHAR(50))) LIKE '%student%' THEN 2
                WHEN LOWER(CAST(u.role AS NVARCHAR(50))) LIKE '%parent%' THEN 3
                ELSE 4
            END,
            u.full_name
    """
    name = f"%{name_like}%" if name_like else None
    return (
        db.execute(text(sql), {"tenant_id": tenant_id, "name": name})
        .mappings()
        .all()
    )


def _scope_summary(ctx) -> str:
    if ctx.kind == "admin":
        return "ALL tenant homework"
    if not ctx.scopes:
        return "NO scopes (count should be 0)"
    parts = []
    for s in ctx.scopes:
        div = f"div={s.class_division_id}" if s.class_division_id is not None else "div=NULL"
        if s.allowed_subject_ids is None:
            subj = "ALL subjects (class teacher)"
        else:
            subj = f"subjects={sorted(s.allowed_subject_ids)}"
        parts.append(f"class={s.class_id}/{div} {subj}")
    return "; ".join(parts)


def _count_for_user(
    db,
    *,
    tenant_id: int,
    user_id: int,
    email: str,
    role: object,
    teacher_id: Optional[int],
    academic_year_id: Optional[int],
) -> tuple[int, Any]:
    ctx = resolve_homework_viewer_context(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        email=email or "",
        legacy_role=role,
        teacher_id=teacher_id,
    )
    count = hw_repo.count_unread_homework(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        academic_year_id=academic_year_id,
        viewer_context=ctx,
    )
    return count, ctx


def main() -> int:
    p = argparse.ArgumentParser(description="Role-wise homework unread counts")
    p.add_argument("--tenant-id", type=int, default=20)
    p.add_argument("--user", type=str, default=None, help="Name substring filter")
    args = p.parse_args()

    db = SessionLocal()
    try:
        year_id = resolve_current_academic_year_id(db, args.tenant_id)
        _print("=" * 72)
        _print(f"HOMEWORK ROLE COUNTS  tenant={args.tenant_id}  current_year_id={year_id}")
        _print("=" * 72)
        _print(
            "Rules: admin=all | class teacher=class all subjects | "
            "subject teacher=own subjects | student=own class"
        )
        _print("")

        users = _resolve_users(db, tenant_id=args.tenant_id, name_like=args.user)
        if not users:
            _print("FAIL No users matched.")
            return 1

        for row in users:
            user_id = int(row["user_id"])
            email = str(row["email"] or "")
            role = row["role"]
            teacher_id = int(row["teacher_id"]) if row["teacher_id"] is not None else None
            label = row["teacher_name"] or row["full_name"] or email

            count_all_years, ctx = _count_for_user(
                db,
                tenant_id=args.tenant_id,
                user_id=user_id,
                email=email,
                role=role,
                teacher_id=teacher_id,
                academic_year_id=None,
            )
            count_current, _ = _count_for_user(
                db,
                tenant_id=args.tenant_id,
                user_id=user_id,
                email=email,
                role=role,
                teacher_id=teacher_id,
                academic_year_id=year_id,
            )

            drift = count_all_years - count_current
            _print(f"-- {label}")
            _print(f"   user_id={user_id}  role={role}  kind={ctx.kind}  teacher_id={teacher_id}")
            _print(f"   scope: {_scope_summary(ctx)}")
            _print(f"   unread ALL years (old buggy sidebar): {count_all_years}")
            _print(f"   unread CURRENT year (correct instant): {count_current}")
            if drift:
                _print(
                    f"   DRIFT +{drift}  <-- login showed {count_all_years} until Homework page "
                    f"applied year filter -> {count_current}"
                )
            else:
                _print("   OK year filter does not change count")
            _print("")

        _print("Done. Sidebar should now match 'unread CURRENT year' on login.")
        return 0
    except Exception as exc:
        _print(f"ERROR {exc}")
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
