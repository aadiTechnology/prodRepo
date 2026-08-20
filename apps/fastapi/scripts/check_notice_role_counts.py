"""
Role-wise Notice unread counts (sidebar Communication badge).

Rules:
  - Tenant admin : all published unread notices in tenant
  - Teacher      : TEACHER + ALL + STUDENT notices for class-teacher class/div
  - Student/parent: ALL (school-wide or their class) + STUDENT notices for their class

Usage (from apps/fastapi):
    python scripts/check_notice_role_counts.py
    python scripts/check_notice_role_counts.py --tenant-id 20
    python scripts/check_notice_role_counts.py --tenant-id 20 --user "Gayatri"
    python scripts/check_notice_role_counts.py --tenant-id 20 --user "Shant"

Exit 0 = counts printed; 1 = error / no users.
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
from app.services import notice_service
from app.services.notice_access import resolve_teacher_notice_target_pairs


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
    return list(
        db.execute(text(sql), {"tenant_id": tenant_id, "name": name}).mappings().all()
    )


def _scope_summary(db, *, tenant_id: int, user_id: int, ctx) -> str:
    if ctx.kind == "admin":
        return "ALL tenant published notices"
    if ctx.kind == "teacher":
        pairs = resolve_teacher_notice_target_pairs(
            db, tenant_id=tenant_id, user_id=user_id
        )
        if pairs:
            pair_txt = ", ".join(f"class={c}/div={d}" for c, d in sorted(pairs))
            return f"TEACHER + ALL + STUDENT for [{pair_txt}]"
        return "TEACHER + unscoped ALL (no class-teacher assignment)"
    if not ctx.scopes:
        return "NO class scopes (count should be 0)"
    parts = [
        f"class={s.class_id}/div={s.class_division_id}"
        for s in ctx.scopes
    ]
    return f"STUDENT/ALL for [{'; '.join(parts)}]"


def main() -> int:
    p = argparse.ArgumentParser(description="Role-wise notice unread counts")
    p.add_argument("--tenant-id", type=int, default=20)
    p.add_argument("--user", type=str, default=None, help="Name substring filter")
    args = p.parse_args()

    db = SessionLocal()
    try:
        _print("=" * 72)
        _print(f"NOTICE ROLE COUNTS  tenant={args.tenant_id}")
        _print("=" * 72)
        _print(
            "Rules: admin=all | teacher=TEACHER+ALL+class-teacher STUDENT | "
            "student=ALL + own class STUDENT"
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
            label = row["teacher_name"] or row["full_name"] or email

            ctx = notice_service.get_viewer_context(
                db,
                tenant_id=args.tenant_id,
                user_id=user_id,
                email=email,
                legacy_role=role,
                manage=False,
            )
            unread = notice_service.count_unread_notices(
                db,
                tenant_id=args.tenant_id,
                user_id=user_id,
                viewer_context=ctx,
            )

            _print(f"-- {label}")
            _print(f"   user_id={user_id}  role={role}  kind={ctx.kind}")
            _print(f"   scope: {_scope_summary(db, tenant_id=args.tenant_id, user_id=user_id, ctx=ctx)}")
            _print(f"   unread (sidebar badge): {unread}")
            _print("")

        _print("Done. Sidebar Communication badge should match unread above on login.")
        return 0
    except Exception as exc:
        _print(f"ERROR {exc}")
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
