from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.support import (
    SupportFaq,
    SupportFaqAttachment,
    SupportFaqFeedback,
    SupportProductUpdate,
)
from app.models.tenant import Tenant
from app.models.user import User


def get_user_display_name(db: Session, user_id: int | None) -> str | None:
    if user_id is None:
        return None
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None
    return user.full_name or str(user.email)


def get_tenant_name(db: Session, tenant_id: int) -> str:
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    return tenant.name if tenant else f"Tenant {tenant_id}"


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
) -> tuple[list[SupportFaq], int]:
    query = db.query(SupportFaq).filter(SupportFaq.is_deleted == False)  # noqa: E712

    if tenant_id is not None:
        query = query.filter(SupportFaq.tenant_id == tenant_id)
    if status:
        query = query.filter(SupportFaq.status == status)
    if category_id:
        query = query.filter(SupportFaq.category_id == category_id)
    if module_name:
        query = query.filter(SupportFaq.module_name == module_name)
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                SupportFaq.title.ilike(term),
                SupportFaq.question.ilike(term),
                SupportFaq.answer.ilike(term),
                SupportFaq.module_name.ilike(term),
                SupportFaq.category_path.ilike(term),
                SupportFaq.owner.ilike(term),
            )
        )

    total = query.count()
    rows = (
        query.order_by(SupportFaq.updated_at.desc(), SupportFaq.created_at.desc())
        .offset(page * size)
        .limit(size)
        .all()
    )
    return rows, total


def get_faq_by_id(
    db: Session,
    *,
    faq_id: int,
    tenant_id: int | None,
) -> SupportFaq | None:
    query = db.query(SupportFaq).filter(
        SupportFaq.id == faq_id,
        SupportFaq.is_deleted == False,  # noqa: E712
    )
    if tenant_id is not None:
        query = query.filter(SupportFaq.tenant_id == tenant_id)
    return query.first()


def create_faq(
    db: Session,
    *,
    tenant_id: int,
    title: str,
    question: str,
    answer: str,
    module_name: str,
    category_id: str,
    category_path: str,
    status: str,
    owner: str,
    language: str,
    user_id: int,
) -> SupportFaq:
    row = SupportFaq(
        tenant_id=tenant_id,
        title=title,
        question=question,
        answer=answer,
        module_name=module_name,
        category_id=category_id,
        category_path=category_path,
        status=status,
        owner=owner,
        language=language,
        created_by=user_id,
    )
    db.add(row)
    db.flush()
    return row


def update_faq_row(
    db: Session,
    row: SupportFaq,
    *,
    user_id: int,
    updates: dict,
) -> SupportFaq:
    for key, value in updates.items():
        if value is not None:
            setattr(row, key, value)
    row.updated_by = user_id
    row.updated_at = datetime.utcnow()
    db.flush()
    return row


def soft_delete_faq(db: Session, row: SupportFaq, *, user_id: int) -> None:
    row.is_deleted = True
    row.deleted_at = datetime.utcnow()
    row.deleted_by = user_id
    db.flush()


def list_faq_attachments(db: Session, *, faq_id: int) -> list[SupportFaqAttachment]:
    return (
        db.query(SupportFaqAttachment)
        .filter(
            SupportFaqAttachment.faq_id == faq_id,
            SupportFaqAttachment.is_deleted == False,  # noqa: E712
        )
        .order_by(SupportFaqAttachment.uploaded_at.asc())
        .all()
    )


def get_faq_attachment(
    db: Session,
    *,
    faq_id: int,
    attachment_id: int,
    tenant_id: int | None,
) -> SupportFaqAttachment | None:
    query = db.query(SupportFaqAttachment).filter(
        SupportFaqAttachment.id == attachment_id,
        SupportFaqAttachment.faq_id == faq_id,
        SupportFaqAttachment.is_deleted == False,  # noqa: E712
    )
    if tenant_id is not None:
        query = query.filter(SupportFaqAttachment.tenant_id == tenant_id)
    return query.first()


def add_faq_attachment(
    db: Session,
    *,
    tenant_id: int,
    faq_id: int,
    file_name: str,
    file_path: str,
    file_type: str,
    file_size_kb: int,
    user_id: int,
) -> SupportFaqAttachment:
    row = SupportFaqAttachment(
        tenant_id=tenant_id,
        faq_id=faq_id,
        file_name=file_name,
        file_path=file_path,
        file_type=file_type,
        file_size_kb=file_size_kb,
        uploaded_by=user_id,
    )
    db.add(row)
    db.flush()
    return row


def soft_delete_faq_attachment(db: Session, row: SupportFaqAttachment, *, user_id: int) -> None:
    row.is_deleted = True
    row.deleted_at = datetime.utcnow()
    row.deleted_by = user_id
    db.flush()


def create_faq_feedback(
    db: Session,
    *,
    faq_id: int,
    tenant_id: int,
    user_id: int,
    is_helpful: bool,
    comment: str | None,
) -> SupportFaqFeedback:
    row = SupportFaqFeedback(
        faq_id=faq_id,
        tenant_id=tenant_id,
        user_id=user_id,
        is_helpful=is_helpful,
        comment=comment,
    )
    db.add(row)
    db.flush()
    return row


def list_product_updates(
    db: Session,
    *,
    page: int,
    size: int,
    search: str | None,
    status: str | None,
) -> tuple[list[SupportProductUpdate], int]:
    query = db.query(SupportProductUpdate).filter(
        SupportProductUpdate.is_deleted == False  # noqa: E712
    )
    if status:
        query = query.filter(SupportProductUpdate.status == status)
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                SupportProductUpdate.title.ilike(term),
                SupportProductUpdate.version.ilike(term),
                SupportProductUpdate.description.ilike(term),
            )
        )

    total = query.count()
    rows = (
        query.order_by(
            SupportProductUpdate.release_date.desc(),
            SupportProductUpdate.created_at.desc(),
        )
        .offset(page * size)
        .limit(size)
        .all()
    )
    return rows, total


def get_product_update_by_id(db: Session, update_id: int) -> SupportProductUpdate | None:
    return (
        db.query(SupportProductUpdate)
        .filter(
            SupportProductUpdate.id == update_id,
            SupportProductUpdate.is_deleted == False,  # noqa: E712
        )
        .first()
    )


def create_product_update(
    db: Session,
    *,
    title: str,
    version: str,
    release_date: date,
    description: str,
    status: str,
    user_id: int,
) -> SupportProductUpdate:
    row = SupportProductUpdate(
        title=title,
        version=version,
        release_date=release_date,
        description=description,
        status=status,
        created_by=user_id,
    )
    db.add(row)
    db.flush()
    return row


def update_product_update_row(
    db: Session,
    row: SupportProductUpdate,
    *,
    user_id: int,
    updates: dict,
) -> SupportProductUpdate:
    for key, value in updates.items():
        if value is not None:
            setattr(row, key, value)
    row.updated_by = user_id
    row.updated_at = datetime.utcnow()
    db.flush()
    return row


def soft_delete_product_update(db: Session, row: SupportProductUpdate, *, user_id: int) -> None:
    row.is_deleted = True
    row.deleted_at = datetime.utcnow()
    row.deleted_by = user_id
    db.flush()
