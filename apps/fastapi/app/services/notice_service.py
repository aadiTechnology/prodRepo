from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException, ValidationException
from app.repositories import notice_repository
from app.schemas.notice import (
    NoticeAttachmentResponse,
    NoticeCreateRequest,
    NoticeListResponse,
    NoticeResponse,
    NoticeTargetResponse,
    NoticeUpdateRequest,
)


ALLOWED_ATTACHMENT_TYPES = {"application/pdf", "image/jpeg", "image/jpg", "image/png"}


def _validate_notice_input(
    *,
    title: str | None,
    description: str | None,
    audience_type: str | None,
    publish_date: datetime | None,
    expiry_date: datetime | None,
    targets: list[dict] | None,
    attachments: list[dict] | None,
) -> None:
    if title is not None and not title.strip():
        raise ValidationException("Please enter notice title")
    if description is not None and not description.strip():
        raise ValidationException("Please enter description")
    if audience_type is not None and audience_type not in {"ALL", "CLASS", "DIVISION"}:
        raise ValidationException("Please select audience")
    if publish_date and expiry_date and expiry_date < publish_date:
        raise ValidationException("Expiry date cannot be before publish date")

    if audience_type in {"CLASS", "DIVISION"}:
        if not targets:
            raise ValidationException("Please select audience")
        if all(t.get("class_id") is None and t.get("division_id") is None for t in targets):
            raise ValidationException("Please select audience")

    if attachments:
        for item in attachments:
            file_type = (item.get("file_type") or "").lower()
            if file_type and file_type not in ALLOWED_ATTACHMENT_TYPES:
                raise ValidationException("Invalid file format or size exceeded")


def _to_notice_response(db: Session, row: dict) -> NoticeResponse:
    targets = notice_repository.get_notice_targets(db, notice_id=int(row["id"]))
    attachments = notice_repository.get_notice_attachments(db, notice_id=int(row["id"]))
    return NoticeResponse(
        id=int(row["id"]),
        tenant_id=int(row["tenant_id"]),
        title=str(row["title"]),
        description=str(row["description"]),
        notice_type=str(row["notice_type"]),
        audience_type=str(row["audience_type"]),
        publish_date=row["publish_date"],
        expiry_date=row.get("expiry_date"),
        is_draft=bool(row["is_draft"]),
        is_published=bool(row["is_published"]),
        send_notification=bool(row["send_notification"]),
        created_by=int(row["created_by"]),
        created_at=row["created_at"],
        updated_by=int(row["updated_by"]) if row.get("updated_by") else None,
        updated_at=row.get("updated_at"),
        is_deleted=bool(row["is_deleted"]),
        targets=[NoticeTargetResponse(**item) for item in targets],
        attachments=[NoticeAttachmentResponse(**item) for item in attachments],
    )


def list_notices(
    db: Session,
    *,
    tenant_id: int,
    page: int,
    size: int,
    search: str | None = None,
    audience_type: str | None = None,
    notice_type: str | None = None,
    is_published: bool | None = None,
) -> NoticeListResponse:
    rows, total = notice_repository.list_notices(
        db,
        tenant_id=tenant_id,
        search=search,
        audience_type=audience_type,
        notice_type=notice_type,
        is_published=is_published,
        page=page,
        size=size,
    )
    return NoticeListResponse(
        items=[_to_notice_response(db, row) for row in rows],
        total=total,
        page=page,
        size=size,
    )


def get_notice(db: Session, *, tenant_id: int, notice_id: int) -> NoticeResponse:
    row = notice_repository.get_notice_by_id(db, tenant_id=tenant_id, notice_id=notice_id)
    if not row:
        raise NotFoundException("Notice", notice_id)
    return _to_notice_response(db, row)


def create_notice(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    payload: NoticeCreateRequest,
) -> NoticeResponse:
    publish_date = payload.publish_date or datetime.utcnow()
    targets = [t.model_dump() for t in payload.targets]
    attachments = [a.model_dump() for a in payload.attachments]

    _validate_notice_input(
        title=payload.title,
        description=payload.description,
        audience_type=payload.audience_type,
        publish_date=publish_date,
        expiry_date=payload.expiry_date,
        targets=targets,
        attachments=attachments,
    )

    is_draft = bool(payload.is_draft)
    is_published = not is_draft
    notice_id = notice_repository.insert_notice(
        db,
        payload={
            "tenant_id": tenant_id,
            "title": payload.title.strip(),
            "description": payload.description.strip(),
            "notice_type": payload.notice_type,
            "audience_type": payload.audience_type,
            "publish_date": publish_date,
            "expiry_date": payload.expiry_date,
            "is_draft": is_draft,
            "is_published": is_published,
            "send_notification": payload.send_notification,
            "created_by": user_id,
            "is_deleted": False,
        },
    )
    notice_repository.replace_notice_targets(
        db,
        notice_id=notice_id,
        targets=[] if payload.audience_type == "ALL" else targets,
    )
    notice_repository.replace_notice_attachments(db, notice_id=notice_id, attachments=attachments)
    db.commit()
    return get_notice(db, tenant_id=tenant_id, notice_id=notice_id)


def update_notice(
    db: Session,
    *,
    tenant_id: int,
    notice_id: int,
    user_id: int,
    payload: NoticeUpdateRequest,
) -> NoticeResponse:
    existing = notice_repository.get_notice_by_id(db, tenant_id=tenant_id, notice_id=notice_id)
    if not existing:
        raise NotFoundException("Notice", notice_id)

    update_data = payload.model_dump(exclude_unset=True)
    targets = update_data.pop("targets", None)
    attachments = update_data.pop("attachments", None)
    if "title" in update_data and update_data["title"] is not None:
        update_data["title"] = update_data["title"].strip()
    if "description" in update_data and update_data["description"] is not None:
        update_data["description"] = update_data["description"].strip()

    next_audience_type = update_data.get("audience_type", existing["audience_type"])
    next_publish_date = update_data.get("publish_date", existing["publish_date"])
    next_expiry_date = update_data.get("expiry_date", existing.get("expiry_date"))
    normalized_targets = [item.model_dump() for item in targets] if targets is not None else None
    normalized_attachments = (
        [item.model_dump() for item in attachments] if attachments is not None else None
    )

    _validate_notice_input(
        title=update_data.get("title", existing["title"]),
        description=update_data.get("description", existing["description"]),
        audience_type=next_audience_type,
        publish_date=next_publish_date,
        expiry_date=next_expiry_date,
        targets=normalized_targets
        if normalized_targets is not None
        else notice_repository.get_notice_targets(db, notice_id=notice_id),
        attachments=normalized_attachments,
    )

    if "is_draft" in update_data and update_data["is_draft"] is not None:
        update_data["is_published"] = not bool(update_data["is_draft"])
    update_data["updated_by"] = user_id
    update_data["updated_at"] = datetime.utcnow()

    notice_repository.update_notice(
        db,
        tenant_id=tenant_id,
        notice_id=notice_id,
        update_fields=update_data,
    )
    if normalized_targets is not None:
        notice_repository.replace_notice_targets(
            db,
            notice_id=notice_id,
            targets=[] if next_audience_type == "ALL" else normalized_targets,
        )
    if normalized_attachments is not None:
        notice_repository.replace_notice_attachments(
            db,
            notice_id=notice_id,
            attachments=normalized_attachments,
        )
    db.commit()
    return get_notice(db, tenant_id=tenant_id, notice_id=notice_id)


def publish_notice(db: Session, *, tenant_id: int, notice_id: int, user_id: int) -> NoticeResponse:
    existing = notice_repository.get_notice_by_id(db, tenant_id=tenant_id, notice_id=notice_id)
    if not existing:
        raise NotFoundException("Notice", notice_id)
    notice_repository.update_notice(
        db,
        tenant_id=tenant_id,
        notice_id=notice_id,
        update_fields={
            "is_draft": False,
            "is_published": True,
            "updated_by": user_id,
            "updated_at": datetime.utcnow(),
        },
    )
    db.commit()
    return get_notice(db, tenant_id=tenant_id, notice_id=notice_id)


def delete_notice(db: Session, *, tenant_id: int, notice_id: int, user_id: int) -> None:
    existing = notice_repository.get_notice_by_id(db, tenant_id=tenant_id, notice_id=notice_id)
    if not existing:
        raise NotFoundException("Notice", notice_id)
    notice_repository.update_notice(
        db,
        tenant_id=tenant_id,
        notice_id=notice_id,
        update_fields={
            "is_deleted": True,
            "updated_by": user_id,
            "updated_at": datetime.utcnow(),
        },
    )
    db.commit()
