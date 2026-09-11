"""Temporary smoke test for notice attachment content proxy. Delete after use."""
from __future__ import annotations

from sqlalchemy import text
from fastapi.testclient import TestClient

from app.core.database import SessionLocal
from app.core.dependencies import get_current_user
from app.main import app
from app.services import notice_service


def main() -> None:
    db = SessionLocal()
    row = db.execute(
        text(
            """
            SELECT TOP 1 id, tenant_id, notice_id, file_name, file_path, file_type
            FROM communication_notice_attachments
            WHERE file_path LIKE 'notice-attachments/%' AND is_deleted = 0
            ORDER BY id DESC
            """
        )
    ).mappings().first()
    db.close()
    print("db_row=", dict(row) if row else None)
    if not row:
        raise SystemExit("No attachment row found")

    class FakeUser:
        id = 1
        tenant_id = int(row["tenant_id"])
        email = "test@example.com"
        role = "admin"

    fake = FakeUser()
    orig_assert = notice_service._assert_notice_visible

    def fake_assert(*_args, **_kwargs):
        return {
            "id": int(row["notice_id"]),
            "tenant_id": int(row["tenant_id"]),
            "status": "PUBLISHED",
            "is_published": True,
            "is_deleted": False,
            "title": "t",
            "description": "d",
            "notice_type": "GENERAL",
            "audience_type": "ALL",
            "publish_date": None,
            "expiry_date": None,
            "published_at": None,
            "unpublished_at": None,
            "send_notification": False,
            "created_by": 1,
            "created_at": None,
            "updated_by": None,
            "updated_at": None,
        }

    notice_service._assert_notice_visible = fake_assert
    notice_service.user_can_manage_notices = lambda _db, _user: True
    notice_service.get_viewer_context = lambda *_a, **_k: None

    content, mime, name = notice_service.get_notice_attachment_content(
        SessionLocal(),
        tenant_id=int(row["tenant_id"]),
        notice_id=int(row["notice_id"]),
        attachment_id=int(row["id"]),
    )
    print("service_ok bytes=", len(content), "mime=", mime, "name=", name)

    app.dependency_overrides[get_current_user] = lambda: fake
    for route in app.routes:
        if getattr(route, "path", "") == (
            "/communications/notices/{notice_id}/attachments/{attachment_id}/content"
        ):
            print("route_found methods=", route.methods)
            for dep in route.dependant.dependencies:
                if dep.call is not None:
                    app.dependency_overrides[dep.call] = lambda: fake
            break

    client = TestClient(app)
    url = f"/communications/notices/{row['notice_id']}/attachments/{row['id']}/content"
    resp = client.get(url)
    print("http_status=", resp.status_code)
    print("content_type=", resp.headers.get("content-type"))
    print("content_disposition=", resp.headers.get("content-disposition"))
    print("body_len=", len(resp.content))
    print("is_jpeg=", resp.content[:2] == b"\xff\xd8")

    notice_service._assert_notice_visible = orig_assert
    app.dependency_overrides.clear()


if __name__ == "__main__":
    main()
