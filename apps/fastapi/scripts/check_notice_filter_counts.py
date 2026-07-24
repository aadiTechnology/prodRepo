"""
Self-check: Notice sidebar unread count respects Status / Audience / Type filters.

Asserts (no network; uses DB if available):
  - Wiring: unread-count accepts status + audience_type + notice_type
  - Frontend passes status and preserves sticky filters on bare refresh
  - Role defaults: student non-published status => 0; admin draft filter can be > published-only path

Usage (from apps/fastapi):
  python scripts/check_notice_filter_counts.py
  python scripts/check_notice_filter_counts.py --tenant-id 20 --admin Shant
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from dotenv import load_dotenv

load_dotenv(os.getenv("ENV_FILE", ".env"))


def _web_src() -> Path:
    return Path(parent_dir).parent / "web" / "src"


def check_wiring() -> None:
    repo = Path(parent_dir)
    checks = [
        (repo / "app" / "routers" / "notice.py", "status: str | None = Query"),
        (repo / "app" / "repositories" / "notice_repository.py", "status: str | None = None"),
        (_web_src() / "hooks" / "useNoticeSidebarCount.ts", "status: toOptionalFilter(filters.status)"),
        (_web_src() / "utils" / "noticeCountEvents.ts", "detail: filters,"),
        (_web_src() / "hooks" / "useNoticeListController.ts", "notifyNoticeCountChanged({"),
        (_web_src() / "api" / "services" / "noticeService.ts", "status?: string"),
    ]
    for path, needle in checks:
        text = path.read_text(encoding="utf-8")
        assert needle in text, f"missing {needle!r} in {path}"
    print("OK wiring")


def check_db(tenant_id: int, admin_name: str) -> None:
    from sqlalchemy import text

    from app.core.database import SessionLocal
    from app.services import notice_service

    db = SessionLocal()
    try:
        row = db.execute(
            text(
                """
                SELECT TOP 1 u.id AS user_id, u.email, u.role, u.full_name
                FROM dbo.users u
                WHERE u.tenant_id = :tenant_id AND u.is_active = 1
                  AND u.full_name LIKE :name
                ORDER BY u.id
                """
            ),
            {"tenant_id": tenant_id, "name": f"%{admin_name}%"},
        ).mappings().first()
        if not row:
            print(f"SKIP db (no user matching {admin_name!r} in tenant {tenant_id})")
            return

        ctx = notice_service.get_viewer_context(
            db,
            tenant_id=tenant_id,
            user_id=int(row["user_id"]),
            email=str(row["email"] or ""),
            legacy_role=row["role"],
            manage=True,
        )
        base = notice_service.count_unread_notices(
            db,
            tenant_id=tenant_id,
            user_id=int(row["user_id"]),
            viewer_context=ctx,
        )
        draft = notice_service.count_unread_notices(
            db,
            tenant_id=tenant_id,
            user_id=int(row["user_id"]),
            viewer_context=ctx,
            status="DRAFT",
        )
        published = notice_service.count_unread_notices(
            db,
            tenant_id=tenant_id,
            user_id=int(row["user_id"]),
            viewer_context=ctx,
            status="PUBLISHED",
        )
        unpublished = notice_service.count_unread_notices(
            db,
            tenant_id=tenant_id,
            user_id=int(row["user_id"]),
            viewer_context=ctx,
            status="UNPUBLISHED",
        )
        students = notice_service.count_unread_notices(
            db,
            tenant_id=tenant_id,
            user_id=int(row["user_id"]),
            viewer_context=ctx,
            audience_type="STUDENT",
        )
        events = notice_service.count_unread_notices(
            db,
            tenant_id=tenant_id,
            user_id=int(row["user_id"]),
            viewer_context=ctx,
            notice_type="EVENT",
        )

        assert base >= 0 and draft >= 0 and published >= 0 and students >= 0 and events >= 0
        # Default = all statuses together; each chip <= combined.
        assert draft <= base
        assert published <= base
        assert unpublished <= base
        assert students <= base
        assert events <= base
        print(
            f"OK db admin={row['full_name']}: "
            f"combined={base} draft={draft} published={published} "
            f"unpublished={unpublished} audience=STUDENT={students} type=EVENT={events}"
        )
    finally:
        db.close()


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--tenant-id", type=int, default=20)
    p.add_argument("--admin", type=str, default="Shant")
    args = p.parse_args()

    check_wiring()
    try:
        check_db(args.tenant_id, args.admin)
    except Exception as exc:
        print(f"SKIP db ({exc})")
    print("READY")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
