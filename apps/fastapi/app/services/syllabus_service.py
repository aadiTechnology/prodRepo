from __future__ import annotations

import os
from datetime import datetime
from typing import cast

from sqlalchemy.orm import Session

from app.core.exceptions import ForbiddenException, NotFoundException, ValidationException
from app.core.logging_config import get_logger
from app.models.user import User
from app.repositories import homework_repository, syllabus_repository
from app.schemas.syllabus_schema import (
    SYLLABUS_MONTHS,
    AcademicYearOption,
    ClassOption,
    SyllabusAttachmentResponse,
    SyllabusCreateRequest,
    SyllabusFilterOptionsResponse,
    SyllabusListResponse,
    SyllabusMonth,
    SyllabusResponse,
    SyllabusUpdateRequest,
)
from app.services.homework_access import (
    HomeworkViewerContext,
    resolve_homework_viewer_context,
)
from app.services import notification_service
from app.services.school_class_service import require_active_class
from app.services.syllabus_attachment_storage import (
    ALLOWED_EXTENSIONS,
    MAX_FILE_BYTES,
    delete_syllabus_attachment_file,
    resolve_attachment_url,
    save_syllabus_attachment_file,
)

logger = get_logger(__name__)

SYLLABUS_MENU_PATH = "/academics/syllabus"


def _actor_display_name(db: Session, user_id: int | None) -> str:
    if not user_id:
        return "System"
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return "System"
    name = (user.full_name or "").strip()
    if name:
        return name
    email = (user.email or "").strip()
    return email or "System"


def _emit_syllabus_notification(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    month: str,
    class_label: str | None,
    syllabus_id: int | None = None,
    event: str = "created",
) -> None:
    """Call shared Notification Create API after syllabus lifecycle events (non-blocking)."""
    month_label = (month or "").strip() or "the selected month"
    if event == "updated":
        if class_label:
            body = f"Syllabus for {class_label} ({month_label}) has been updated."
        else:
            body = f"Syllabus for {month_label} has been updated."
    elif event == "deleted":
        if class_label:
            body = f"Syllabus for {class_label} ({month_label}) has been deleted."
        else:
            body = f"Syllabus for {month_label} has been deleted."
    else:
        event = "created"
        if class_label:
            body = f"Syllabus for {class_label} ({month_label}) has been created."
        else:
            body = f"Syllabus for {month_label} has been created."
    try:
        notification_service.create_notification(
            db,
            tenant_id=tenant_id,
            from_=_actor_display_name(db, user_id),
            to="STUDENT",
            subject="Syllabus Notification",
            body=body,
            created_by=user_id,
            module="syllabus",
            entity_id=syllabus_id,
            event=event,
        )
    except Exception:
        logger.exception(
            "Failed to create notification after syllabus %s (syllabus_id=%s)",
            event,
            syllabus_id,
        )

def get_viewer_context(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    email: str,
    legacy_role: object,
) -> HomeworkViewerContext:
    teacher_id = homework_repository._resolve_teacher_id(db, tenant_id, user_id)
    return resolve_homework_viewer_context(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        email=email,
        legacy_role=legacy_role,
        teacher_id=teacher_id,
    )


def _scoped_class_ids(viewer_context: HomeworkViewerContext | None) -> list[int] | None:
    """None = no class scope (admin). List = restrict to those classes."""
    if viewer_context is None or viewer_context.kind == "admin":
        return None
    return sorted({scope.class_id for scope in viewer_context.scopes})


def _assert_class_in_scope(
    *,
    class_id: int,
    viewer_context: HomeworkViewerContext | None,
) -> None:
    scoped = _scoped_class_ids(viewer_context)
    if scoped is None:
        return
    if class_id not in scoped:
        raise ForbiddenException("Not authorized for this class")


def _validate_month(month: str) -> None:
    if month not in SYLLABUS_MONTHS:
        raise ValidationException(
            f"Invalid month. Allowed: {', '.join(SYLLABUS_MONTHS)}"
        )


def _to_attachment_response(att) -> SyllabusAttachmentResponse:
    return SyllabusAttachmentResponse(
        id=att.id,
        file_name=att.file_name,
        file_path=resolve_attachment_url(att.file_path),
        file_type=att.file_type,
        file_size_kb=att.file_size_kb,
        uploaded_at=att.uploaded_at,
    )


def _to_response(db: Session, row) -> SyllabusResponse:
    attachment = syllabus_repository.get_active_attachment(db, syllabus_id=row.id)
    uploaded_by_name = (
        syllabus_repository.get_user_display_name(db, row.uploaded_by)
        or str(row.uploaded_by)
    )
    return SyllabusResponse(
        id=row.id,
        academic_year_id=row.academic_year_id,
        academic_year_name=row.academic_year.name if row.academic_year else "",
        class_id=row.class_id,
        class_name=row.class_model.name if row.class_model else "",
        month=cast(SyllabusMonth, row.month),
        uploaded_by_name=uploaded_by_name,
        upload_date=row.upload_date,
        attachment=_to_attachment_response(attachment) if attachment else None,
    )


def get_filter_options(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    viewer_context: HomeworkViewerContext | None = None,
) -> SyllabusFilterOptionsResponse:
    years = syllabus_repository.list_academic_years(db, tenant_id=tenant_id)
    scoped = _scoped_class_ids(viewer_context)

    if scoped is None:
        classes = syllabus_repository.list_active_classes(db, tenant_id=tenant_id)
    elif not scoped:
        classes = []
    else:
        classes = [
            c
            for c in syllabus_repository.list_active_classes(db, tenant_id=tenant_id)
            if int(c.id) in scoped
        ]

    if viewer_context and viewer_context.kind == "teacher" and not classes:
        teacher_classes = homework_repository.get_classes_for_teacher(
            db, tenant_id=tenant_id, user_id=user_id
        )
        return SyllabusFilterOptionsResponse(
            academic_years=[
                AcademicYearOption(
                    id=int(y.id),
                    name=str(y.name),
                    is_current=bool(y.is_current),
                )
                for y in years
            ],
            classes=[ClassOption(id=c.id, name=c.name) for c in teacher_classes],
            months=list(SYLLABUS_MONTHS),
        )

    return SyllabusFilterOptionsResponse(
        academic_years=[
            AcademicYearOption(
                id=int(y.id),
                name=str(y.name),
                is_current=bool(y.is_current),
            )
            for y in years
        ],
        classes=[ClassOption(id=int(c.id), name=str(c.name)) for c in classes],
        months=list(SYLLABUS_MONTHS),
    )


def list_syllabus(
    db: Session,
    *,
    tenant_id: int,
    page: int,
    size: int,
    search: str | None,
    academic_year_id: int | None,
    class_id: int | None,
    month: str | None,
    scoped_class_id: int | None,
    viewer_context: HomeworkViewerContext | None,
) -> SyllabusListResponse:
    if month:
        _validate_month(month)

    scoped_ids = _scoped_class_ids(viewer_context)
    if scoped_class_id is not None:
        _assert_class_in_scope(class_id=scoped_class_id, viewer_context=viewer_context)
        if class_id is None:
            class_id = scoped_class_id
        elif class_id != scoped_class_id:
            raise ForbiddenException("Not authorized for this class")

    if class_id is not None:
        _assert_class_in_scope(class_id=class_id, viewer_context=viewer_context)

    rows, total = syllabus_repository.list_syllabus(
        db,
        tenant_id=tenant_id,
        page=page,
        size=size,
        search=search,
        academic_year_id=academic_year_id,
        class_id=class_id,
        month=month,
        scoped_class_ids=scoped_ids,
    )
    return SyllabusListResponse(
        items=[_to_response(db, row) for row in rows],
        total=total,
        page=page,
        size=size,
    )


def get_syllabus(
    db: Session,
    *,
    tenant_id: int,
    syllabus_id: int,
    viewer_context: HomeworkViewerContext | None,
) -> SyllabusResponse:
    row = syllabus_repository.get_syllabus_by_id(
        db, tenant_id=tenant_id, syllabus_id=syllabus_id
    )
    if not row:
        raise NotFoundException("Syllabus not found")
    _assert_class_in_scope(class_id=int(row.class_id), viewer_context=viewer_context)
    return _to_response(db, row)


def create_syllabus(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    payload: SyllabusCreateRequest,
    viewer_context: HomeworkViewerContext | None,
) -> SyllabusResponse:
    _validate_month(payload.month)
    _assert_class_in_scope(class_id=payload.class_id, viewer_context=viewer_context)

    year = syllabus_repository.get_academic_year(
        db, tenant_id=tenant_id, academic_year_id=payload.academic_year_id
    )
    if not year:
        raise ValidationException("Academic year not found")

    require_active_class(db, tenant_id, payload.class_id)

    row = syllabus_repository.create_syllabus(
        db,
        tenant_id=tenant_id,
        academic_year_id=payload.academic_year_id,
        class_id=payload.class_id,
        month=payload.month,
        user_id=user_id,
    )
    db.commit()
    db.refresh(row)

    class_label = None
    try:
        if row.class_model and getattr(row.class_model, "name", None):
            class_label = str(row.class_model.name).strip() or None
    except Exception:
        class_label = None

    _emit_syllabus_notification(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        month=str(payload.month or row.month or ""),
        class_label=class_label,
        syllabus_id=int(row.id) if row.id is not None else None,
        event="created",
    )

    return _to_response(db, row)


def update_syllabus(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    syllabus_id: int,
    payload: SyllabusUpdateRequest,
    viewer_context: HomeworkViewerContext | None,
) -> SyllabusResponse:
    _validate_month(payload.month)
    row = syllabus_repository.get_syllabus_by_id(
        db, tenant_id=tenant_id, syllabus_id=syllabus_id
    )
    if not row:
        raise NotFoundException("Syllabus not found")

    _assert_class_in_scope(class_id=int(row.class_id), viewer_context=viewer_context)
    _assert_class_in_scope(class_id=payload.class_id, viewer_context=viewer_context)

    year = syllabus_repository.get_academic_year(
        db, tenant_id=tenant_id, academic_year_id=payload.academic_year_id
    )
    if not year:
        raise ValidationException("Academic year not found")

    require_active_class(db, tenant_id, payload.class_id)

    syllabus_repository.update_syllabus_row(
        db,
        row,
        user_id=user_id,
        academic_year_id=payload.academic_year_id,
        class_id=payload.class_id,
        month=payload.month,
    )
    db.commit()
    db.refresh(row)

    class_label = None
    try:
        if row.class_model and getattr(row.class_model, "name", None):
            class_label = str(row.class_model.name).strip() or None
    except Exception:
        class_label = None

    _emit_syllabus_notification(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        month=str(payload.month or row.month or ""),
        class_label=class_label,
        syllabus_id=syllabus_id,
        event="updated",
    )

    return _to_response(db, row)


def delete_syllabus(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    syllabus_id: int,
    viewer_context: HomeworkViewerContext | None,
) -> None:
    row = syllabus_repository.get_syllabus_by_id(
        db, tenant_id=tenant_id, syllabus_id=syllabus_id
    )
    if not row:
        raise NotFoundException("Syllabus not found")
    _assert_class_in_scope(class_id=int(row.class_id), viewer_context=viewer_context)

    class_label = None
    try:
        if row.class_model and getattr(row.class_model, "name", None):
            class_label = str(row.class_model.name).strip() or None
    except Exception:
        class_label = None
    month = str(row.month or "")

    attachment = syllabus_repository.get_active_attachment(db, syllabus_id=row.id)
    if attachment:
        syllabus_repository.soft_delete_attachment(db, attachment, user_id=user_id)
        try:
            delete_syllabus_attachment_file(attachment.file_path)
        except Exception:
            pass

    syllabus_repository.soft_delete_syllabus(db, row, user_id=user_id)
    db.commit()

    _emit_syllabus_notification(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        month=month,
        class_label=class_label,
        syllabus_id=syllabus_id,
        event="deleted",
    )

def upload_attachment(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    syllabus_id: int,
    file_name: str,
    content: bytes,
    content_type: str | None,
    viewer_context: HomeworkViewerContext | None,
) -> SyllabusAttachmentResponse:
    row = syllabus_repository.get_syllabus_by_id(
        db, tenant_id=tenant_id, syllabus_id=syllabus_id
    )
    if not row:
        raise NotFoundException("Syllabus not found")
    _assert_class_in_scope(class_id=int(row.class_id), viewer_context=viewer_context)

    stored_path = save_syllabus_attachment_file(
        tenant_id=tenant_id,
        syllabus_id=syllabus_id,
        file_name=file_name,
        content=content,
        content_type=content_type,
    )

    existing = syllabus_repository.get_active_attachment(db, syllabus_id=syllabus_id)
    if existing:
        syllabus_repository.soft_delete_attachment(db, existing, user_id=user_id)
        try:
            delete_syllabus_attachment_file(existing.file_path)
        except Exception:
            pass

    extension = os.path.splitext(file_name or "")[1].lower().lstrip(".")
    att = syllabus_repository.add_attachment(
        db,
        tenant_id=tenant_id,
        syllabus_id=syllabus_id,
        file_name=file_name,
        file_path=stored_path,
        file_type=content_type or extension or None,
        file_size_kb=int(len(content) / 1024) if content else 0,
        user_id=user_id,
    )

    now = datetime.utcnow()
    row.upload_date = now
    row.uploaded_by = user_id
    row.updated_at = now
    row.updated_by = user_id
    db.commit()
    db.refresh(att)
    return _to_attachment_response(att)


def delete_attachment(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    syllabus_id: int,
    attachment_id: int,
    viewer_context: HomeworkViewerContext | None,
) -> None:
    row = syllabus_repository.get_syllabus_by_id(
        db, tenant_id=tenant_id, syllabus_id=syllabus_id
    )
    if not row:
        raise NotFoundException("Syllabus not found")
    _assert_class_in_scope(class_id=int(row.class_id), viewer_context=viewer_context)

    att = syllabus_repository.get_attachment(
        db,
        tenant_id=tenant_id,
        syllabus_id=syllabus_id,
        attachment_id=attachment_id,
    )
    if not att:
        raise NotFoundException("Attachment not found")

    syllabus_repository.soft_delete_attachment(db, att, user_id=user_id)
    try:
        delete_syllabus_attachment_file(att.file_path)
    except Exception:
        pass
    db.commit()


__all__ = [
    "SYLLABUS_MENU_PATH",
    "ALLOWED_EXTENSIONS",
    "MAX_FILE_BYTES",
    "get_viewer_context",
    "get_filter_options",
    "list_syllabus",
    "get_syllabus",
    "create_syllabus",
    "update_syllabus",
    "delete_syllabus",
    "upload_attachment",
    "delete_attachment",
]
