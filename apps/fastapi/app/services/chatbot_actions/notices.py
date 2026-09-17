"""Chatbot action: get_notices — published/visible notices only."""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.services import notice_service
from app.services.chatbot_actions.errors import from_exception, validation
from app.services.chatbot_actions.scope import cap_limit
from app.services.notice_access import is_notice_consumer


def get_notices(db: Session, current_user: Any, payload: dict[str, Any]) -> dict[str, Any]:
    try:
        return _get_notices(db, current_user, payload or {})
    except Exception as exc:
        raise from_exception(exc) from exc


def _get_notices(db: Session, current_user: Any, payload: dict[str, Any]) -> dict[str, Any]:
    notice_type = _optional_upper(payload.get("notice_type"))
    audience_type = _optional_upper(payload.get("audience_type"))
    search = str(payload.get("search") or "").strip() or None
    limit = cap_limit(payload.get("limit"), default=10, maximum=20)

    can_manage = notice_service.user_can_manage_notices(db, current_user)
    viewer = notice_service.get_viewer_context(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        email=str(current_user.email),
        legacy_role=current_user.role,
        manage=can_manage,
    )

    if viewer.kind in ("student", "parent") and audience_type == "ADMIN":
        raise validation("Students and parents cannot request admin notices.")

    is_published = True if is_notice_consumer(viewer) or viewer.published_only else None

    listing = notice_service.list_notices(
        db,
        tenant_id=current_user.tenant_id,
        page=0,
        size=limit,
        search=search,
        audience_type=audience_type,
        notice_type=notice_type,
        is_published=is_published,
        viewer_context=viewer,
        current_user_id=current_user.id,
    )

    items = []
    for notice in listing.items:
        if viewer.published_only and not notice.is_published:
            continue
        publish_date = notice.publish_date.date().isoformat() if notice.publish_date else None
        expiry_date = notice.expiry_date.date().isoformat() if notice.expiry_date else None
        items.append(
            {
                "notice_id": int(notice.id),
                "title": notice.title,
                "description": notice.description,
                "notice_type": getattr(notice.notice_type, "value", str(notice.notice_type)),
                "publish_date": publish_date,
                "expiry_date": expiry_date,
                "has_attachment": bool(notice.attachments),
            }
        )

    return {"action": "get_notices", "items": items, "count": len(items)}


def _optional_upper(value: object) -> str | None:
    if value is None or value == "":
        return None
    return str(value).strip().upper()
