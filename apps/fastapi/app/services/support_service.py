from __future__ import annotations

import os
from typing import Literal, cast

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException, ValidationException
from app.repositories import support_repository
from app.schemas.support import (
    FAQ_LANGUAGES,
    SUPPORT_STATUSES,
    FaqAttachmentResponse,
    FaqCreateRequest,
    FaqFeedbackRequest,
    FaqFeedbackResponse,
    FaqListResponse,
    FaqResponse,
    FaqUpdateRequest,
    ProductUpdateCreateRequest,
    ProductUpdateListResponse,
    ProductUpdateResponse,
    ProductUpdateUpdateRequest,
)
from app.services.support_attachment_storage import (
    attachment_display_type,
    delete_faq_attachment_file,
    delete_release_note_file,
    disk_path_for_faq_attachment,
    disk_path_for_release_note,
    resolve_attachment_url,
    save_faq_attachment_file,
    save_release_note_file,
)


def _validate_status(status: str) -> None:
    if status not in SUPPORT_STATUSES:
        raise ValidationException(f"Invalid status. Allowed: {', '.join(SUPPORT_STATUSES)}")


def _validate_language(language: str) -> None:
    if language not in FAQ_LANGUAGES:
        raise ValidationException(f"Invalid language. Allowed: {', '.join(FAQ_LANGUAGES)}")


def _build_faq_response(
    db: Session,
    row,
    *,
    sr_no: int | None = None,
) -> FaqResponse:
    attachments = support_repository.list_faq_attachments(db, faq_id=row.id)
    created_by = support_repository.get_user_display_name(db, row.created_by) or str(row.created_by)
    modified_by = support_repository.get_user_display_name(db, row.updated_by)
    tenant_name = support_repository.get_tenant_name(db, row.tenant_id)

    return FaqResponse(
        id=row.id,
        sr_no=sr_no,
        title=row.title,
        question=row.question,
        answer=row.answer,
        module=row.module_name,
        category_id=row.category_id,
        category_path=row.category_path,
        status=row.status,
        owner=row.owner,
        tenant_id=row.tenant_id,
        tenant_name=tenant_name,
        language=row.language,
        attachments=[
            FaqAttachmentResponse(
                id=att.id,
                name=att.file_name,
                type=attachment_display_type(att.file_type),
                url=resolve_attachment_url(att.file_path),
                file_size_kb=att.file_size_kb,
            )
            for att in attachments
        ],
        created_at=row.created_at,
        last_modified_at=row.updated_at or row.created_at,
        created_by=created_by,
        modified_by=modified_by,
    )


def _build_product_update_response(db: Session, row) -> ProductUpdateResponse:
    created_by = support_repository.get_user_display_name(db, row.created_by) or str(row.created_by)
    modified_by = support_repository.get_user_display_name(db, row.updated_by)

    return ProductUpdateResponse(
        id=row.id,
        title=row.title,
        version=row.version,
        release_date=row.release_date,
        description=row.description,
        status=row.status,
        attachment_name=row.file_name,
        attachment_type=cast(Literal["pdf", "doc", "docx"], row.file_type) if row.file_type else None,
        attachment_url=resolve_attachment_url(row.file_path) if row.file_path else None,
        created_by=created_by,
        modified_by=modified_by,
        modified_date=row.updated_at or row.created_at,
    )


def list_faqs(
    db: Session,
    *,
    tenant_id: int | None,
    page: int,
    size: int,
    search: str | None,
    status: str | None,
    category_id: str | None,
    module_name: str | None,
) -> FaqListResponse:
    rows, total = support_repository.list_faqs(
        db,
        tenant_id=tenant_id,
        page=page,
        size=size,
        search=search,
        status=status,
        category_id=category_id,
        module_name=module_name,
    )
    start_sr = page * size + 1
    items = [
        _build_faq_response(db, row, sr_no=start_sr + index)
        for index, row in enumerate(rows)
    ]
    return FaqListResponse(items=items, total=total, page=page, size=size)


def get_faq(db: Session, *, faq_id: int, tenant_id: int | None) -> FaqResponse:
    row = support_repository.get_faq_by_id(db, faq_id=faq_id, tenant_id=tenant_id)
    if not row:
        raise NotFoundException("FAQ", faq_id)
    return _build_faq_response(db, row)


def create_faq(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    payload: FaqCreateRequest,
) -> FaqResponse:
    _validate_status(payload.status)
    _validate_language(payload.language)

    category_path = (payload.category_path or payload.category_id).strip()
    row = support_repository.create_faq(
        db,
        tenant_id=tenant_id,
        title=payload.title.strip(),
        question=payload.question.strip(),
        answer=payload.answer.strip(),
        module_name=payload.module_name.strip(),
        category_id=payload.category_id.strip(),
        category_path=category_path,
        status=payload.status,
        owner=payload.owner.strip(),
        language=payload.language,
        user_id=user_id,
    )
    db.commit()
    db.refresh(row)
    return _build_faq_response(db, row)


def update_faq(
    db: Session,
    *,
    faq_id: int,
    tenant_id: int | None,
    user_id: int,
    payload: FaqUpdateRequest,
) -> FaqResponse:
    row = support_repository.get_faq_by_id(db, faq_id=faq_id, tenant_id=tenant_id)
    if not row:
        raise NotFoundException("FAQ", faq_id)

    if payload.status is not None:
        _validate_status(payload.status)
    if payload.language is not None:
        _validate_language(payload.language)

    updates: dict = {}
    if payload.title is not None:
        updates["title"] = payload.title.strip()
    if payload.question is not None:
        updates["question"] = payload.question.strip()
    if payload.answer is not None:
        updates["answer"] = payload.answer.strip()
    if payload.module_name is not None:
        updates["module_name"] = payload.module_name.strip()
    if payload.category_id is not None:
        updates["category_id"] = payload.category_id.strip()
    if payload.category_path is not None:
        updates["category_path"] = payload.category_path.strip()
    elif payload.category_id is not None:
        updates["category_path"] = payload.category_id.strip()
    if payload.status is not None:
        updates["status"] = payload.status
    if payload.owner is not None:
        updates["owner"] = payload.owner.strip()
    if payload.language is not None:
        updates["language"] = payload.language
    if payload.tenant_id is not None:
        updates["tenant_id"] = payload.tenant_id

    support_repository.update_faq_row(db, row, user_id=user_id, updates=updates)
    db.commit()
    db.refresh(row)
    return _build_faq_response(db, row)


def delete_faq(db: Session, *, faq_id: int, tenant_id: int | None, user_id: int) -> None:
    row = support_repository.get_faq_by_id(db, faq_id=faq_id, tenant_id=tenant_id)
    if not row:
        raise NotFoundException("FAQ", faq_id)
    support_repository.soft_delete_faq(db, row, user_id=user_id)
    db.commit()


def upload_faq_attachment(
    db: Session,
    *,
    faq_id: int,
    tenant_id: int | None,
    user_id: int,
    file_name: str,
    content: bytes,
    content_type: str,
) -> FaqAttachmentResponse:
    row = support_repository.get_faq_by_id(db, faq_id=faq_id, tenant_id=tenant_id)
    if not row:
        raise NotFoundException("FAQ", faq_id)

    stored_path = save_faq_attachment_file(
        tenant_id=row.tenant_id,
        faq_id=faq_id,
        file_name=file_name,
        content=content,
        content_type=content_type,
    )
    attachment = support_repository.add_faq_attachment(
        db,
        tenant_id=row.tenant_id,
        faq_id=faq_id,
        file_name=file_name,
        file_path=stored_path,
        file_type=content_type,
        file_size_kb=int(len(content) / 1024),
        user_id=user_id,
    )
    db.commit()
    db.refresh(attachment)
    return FaqAttachmentResponse(
        id=attachment.id,
        name=attachment.file_name,
        type=attachment_display_type(attachment.file_type),
        url=resolve_attachment_url(attachment.file_path),
        file_size_kb=attachment.file_size_kb,
    )


def delete_faq_attachment(
    db: Session,
    *,
    faq_id: int,
    attachment_id: int,
    tenant_id: int | None,
    user_id: int,
) -> None:
    row = support_repository.get_faq_by_id(db, faq_id=faq_id, tenant_id=tenant_id)
    if not row:
        raise NotFoundException("FAQ", faq_id)

    attachment = support_repository.get_faq_attachment(
        db,
        faq_id=faq_id,
        attachment_id=attachment_id,
        tenant_id=tenant_id,
    )
    if not attachment:
        raise NotFoundException("FAQ attachment", attachment_id)

    file_path = attachment.file_path
    support_repository.soft_delete_faq_attachment(db, attachment, user_id=user_id)
    db.commit()
    if file_path:
        delete_faq_attachment_file(file_path)


def submit_faq_feedback(
    db: Session,
    *,
    faq_id: int,
    tenant_id: int | None,
    user_id: int,
    payload: FaqFeedbackRequest,
) -> FaqFeedbackResponse:
    row = support_repository.get_faq_by_id(db, faq_id=faq_id, tenant_id=tenant_id)
    if not row:
        raise NotFoundException("FAQ", faq_id)

    feedback = support_repository.create_faq_feedback(
        db,
        faq_id=faq_id,
        tenant_id=row.tenant_id,
        user_id=user_id,
        is_helpful=payload.is_helpful,
        comment=payload.comment.strip() if payload.comment else None,
    )
    db.commit()
    db.refresh(feedback)
    return FaqFeedbackResponse(
        id=feedback.id,
        faq_id=feedback.faq_id,
        is_helpful=feedback.is_helpful,
        comment=feedback.comment,
        created_at=feedback.created_at,
    )


def list_product_updates(
    db: Session,
    *,
    page: int,
    size: int,
    search: str | None,
    status: str | None,
) -> ProductUpdateListResponse:
    rows, total = support_repository.list_product_updates(
        db,
        page=page,
        size=size,
        search=search,
        status=status,
    )
    items = [_build_product_update_response(db, row) for row in rows]
    return ProductUpdateListResponse(items=items, total=total, page=page, size=size)


def get_product_update(db: Session, update_id: int) -> ProductUpdateResponse:
    row = support_repository.get_product_update_by_id(db, update_id)
    if not row:
        raise NotFoundException("Product update", update_id)
    return _build_product_update_response(db, row)


def create_product_update(
    db: Session,
    *,
    user_id: int,
    payload: ProductUpdateCreateRequest,
) -> ProductUpdateResponse:
    _validate_status(payload.status)
    row = support_repository.create_product_update(
        db,
        title=payload.title.strip(),
        version=payload.version.strip(),
        release_date=payload.release_date,
        description=payload.description.strip(),
        status=payload.status,
        user_id=user_id,
    )
    db.commit()
    db.refresh(row)
    return _build_product_update_response(db, row)


def update_product_update(
    db: Session,
    *,
    update_id: int,
    user_id: int,
    payload: ProductUpdateUpdateRequest,
) -> ProductUpdateResponse:
    row = support_repository.get_product_update_by_id(db, update_id)
    if not row:
        raise NotFoundException("Product update", update_id)

    if payload.status is not None:
        _validate_status(payload.status)

    updates: dict = {}
    if payload.title is not None:
        updates["title"] = payload.title.strip()
    if payload.version is not None:
        updates["version"] = payload.version.strip()
    if payload.release_date is not None:
        updates["release_date"] = payload.release_date
    if payload.description is not None:
        updates["description"] = payload.description.strip()
    if payload.status is not None:
        updates["status"] = payload.status

    support_repository.update_product_update_row(db, row, user_id=user_id, updates=updates)
    db.commit()
    db.refresh(row)
    return _build_product_update_response(db, row)


def delete_product_update(db: Session, *, update_id: int, user_id: int) -> None:
    row = support_repository.get_product_update_by_id(db, update_id)
    if not row:
        raise NotFoundException("Product update", update_id)

    file_path = row.file_path
    support_repository.soft_delete_product_update(db, row, user_id=user_id)
    db.commit()
    if file_path:
        delete_release_note_file(file_path)


def upload_release_note(
    db: Session,
    *,
    update_id: int,
    user_id: int,
    file_name: str,
    content: bytes,
    content_type: str,
) -> ProductUpdateResponse:
    row = support_repository.get_product_update_by_id(db, update_id)
    if not row:
        raise NotFoundException("Product update", update_id)

    if row.file_path:
        delete_release_note_file(row.file_path)

    stored_path, file_type = save_release_note_file(
        update_id=update_id,
        file_name=file_name,
        content=content,
        content_type=content_type,
    )
    support_repository.update_product_update_row(
        db,
        row,
        user_id=user_id,
        updates={
            "file_name": file_name,
            "file_path": stored_path,
            "file_type": file_type,
            "file_size_kb": int(len(content) / 1024),
        },
    )
    db.commit()
    db.refresh(row)
    return _build_product_update_response(db, row)


def get_release_note_download(
    update_id: int, db: Session
) -> tuple[Literal["redirect", "file"], str, str]:
    """Return (mode, url_or_path, filename) for release-note download."""
    row = support_repository.get_product_update_by_id(db, update_id)
    if not row or not row.file_path:
        raise NotFoundException("Release note", update_id)

    filename = row.file_name or f"release-note-{update_id}"
    resolved = resolve_attachment_url(row.file_path)
    if resolved.startswith("http://") or resolved.startswith("https://"):
        return "redirect", resolved, filename

    disk_path = disk_path_for_release_note(row.file_path)
    if not os.path.exists(disk_path):
        raise NotFoundException("Release note file", update_id)
    return "file", disk_path, filename


def get_faq_attachment_download(
    db: Session,
    *,
    faq_id: int,
    attachment_id: int,
    tenant_id: int | None,
) -> tuple[Literal["redirect", "file"], str, str]:
    """Return (mode, url_or_path, filename) for FAQ attachment download."""
    attachment = support_repository.get_faq_attachment(
        db,
        faq_id=faq_id,
        attachment_id=attachment_id,
        tenant_id=tenant_id,
    )
    if not attachment:
        raise NotFoundException("FAQ attachment", attachment_id)

    resolved = resolve_attachment_url(attachment.file_path)
    if resolved.startswith("http://") or resolved.startswith("https://"):
        return "redirect", resolved, attachment.file_name

    disk_path = disk_path_for_faq_attachment(attachment.file_path)
    if not os.path.exists(disk_path):
        raise NotFoundException("FAQ attachment file", attachment_id)
    return "file", disk_path, attachment.file_name
