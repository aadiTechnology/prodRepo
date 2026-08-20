from __future__ import annotations

from datetime import datetime
from typing import Literal, cast

from sqlalchemy.orm import Session

from app.core.exceptions import ForbiddenException, NotFoundException, ValidationException
from app.repositories import support_repository
from app.schemas.support_schema import (
    QUERY_STATUSES,
    ReleaseNoteCreateRequest,
    ReleaseNoteListResponse,
    ReleaseNoteResponse,
    ReleaseNoteShowToResponse,
    ReleaseNoteUpdateRequest,
    SupportMarkViewedResponse,
    SupportQueryCreateRequest,
    SupportQueryListResponse,
    SupportQueryMessageCreateRequest,
    SupportQueryMessageUpdateRequest,
    SupportQueryMessageResponse,
    SupportQueryResponse,
    SupportQueryUpdateRequest,
    SupportUnreadCountResponse,
)
from app.services.support_access import (
    can_forward_query,
    can_view_query,
    can_view_release_note,
    can_access_queries,
    is_query_owner,
    require_tenant_id,
    resolve_actor_role,
    resolve_support_tenant_id,
)
from app.services.support_attachment_storage import (
    delete_query_attachment_file,
    delete_release_note_file,
    resolve_attachment_url,
    save_query_attachment_file,
    save_release_note_file,
)


def _validate_query_status(status: str) -> None:
    if status not in QUERY_STATUSES:
        raise ValidationException(f"Invalid status. Allowed: {', '.join(QUERY_STATUSES)}")


def _validate_category(category: str) -> None:
    name = category.strip()
    if not name:
        raise ValidationException("Please select a category.")
    if len(name) > 100:
        raise ValidationException("Category name is too long.")


def _build_message_response(db: Session, message) -> SupportQueryMessageResponse:
    author = support_repository.get_user_display_name(db, message.author_user_id) or "User"
    return SupportQueryMessageResponse(
        id=str(message.id),
        author=author,
        author_role=message.author_role,
        body=message.body,
        created_at=message.created_at,
    )


def _query_is_viewed(row, read_at: datetime | None) -> bool:
    if read_at is None:
        return False
    last_activity = support_repository.query_last_activity_at(row)
    return read_at >= last_activity


def _build_query_response(db: Session, row, *, is_viewed: bool = False) -> SupportQueryResponse:
    created_by = support_repository.get_user_display_name(db, row.created_by) or "User"
    forwarded_by = support_repository.get_user_display_name(db, row.forwarded_by)

    return SupportQueryResponse(
        id=row.query_ref,
        category=row.category,
        subject=row.subject,
        description=row.description,
        attachment_name=row.attachment_file_name,
        attachment_url=resolve_attachment_url(row.attachment_file_path),
        created_by=created_by,
        created_by_role=cast(
            Literal["SUPER_ADMIN", "ADMIN", "TEACHER", "STUDENT"],
            row.created_by_role,
        ),
        created_at=row.created_at,
        status=row.status,
        messages=[_build_message_response(db, msg) for msg in row.messages],
        forwarded_to_super_admin=bool(row.forwarded_to_super_admin),
        forwarded_by=forwarded_by,
        forwarded_at=row.forwarded_at,
        is_viewed=is_viewed,
    )


def _build_query_responses_for_user(
    db: Session,
    *,
    current_user: object,
    rows: list,
) -> list[SupportQueryResponse]:
    if not rows:
        return []
    user_id = int(getattr(current_user, "id"))
    read_map = support_repository.get_query_read_at_map(
        db,
        user_id=user_id,
        query_ids=[row.id for row in rows],
    )
    return [
        _build_query_response(
            db,
            row,
            is_viewed=_query_is_viewed(row, read_map.get(row.id)),
        )
        for row in rows
    ]


def _build_release_note_response(db: Session, row) -> ReleaseNoteResponse:
    created_by = support_repository.get_user_display_name(db, row.created_by) or "User"
    modified_by = support_repository.get_user_display_name(db, row.updated_by)

    return ReleaseNoteResponse(
        id=row.id,
        title=row.title,
        version=row.version,
        release_date=row.release_date,
        description=row.description,
        status=row.status,
        attachment_name=row.file_name,
        attachment_type=cast(Literal["pdf", "doc", "docx"], row.file_type)
        if row.file_type
        else None,
        attachment_url=resolve_attachment_url(row.file_path),
        created_by=created_by,
        modified_by=modified_by,
        modified_date=row.updated_at or row.created_at,
        show_to=ReleaseNoteShowToResponse(
            admin=bool(row.show_to_admin),
            teacher=bool(row.show_to_teacher),
            student=bool(row.show_to_student),
        ),
    )


def _auto_mark_query_read(db: Session, *, row, user_id: int) -> None:
    support_repository.mark_query_read(
        db,
        tenant_id=row.tenant_id,
        query_id=row.id,
        user_id=user_id,
    )


def count_unread_queries(db: Session, *, current_user: object) -> int:
    if not can_access_queries(db, current_user):
        return 0

    tenant_id = resolve_support_tenant_id(db, current_user)
    user_id = int(getattr(current_user, "id"))
    rows = support_repository.list_queries_for_unread_count(db, tenant_id=tenant_id)
    visible = [row for row in rows if can_view_query(db, current_user, row)]
    if not visible:
        return 0

    read_map = support_repository.get_query_read_at_map(
        db,
        user_id=user_id,
        query_ids=[row.id for row in visible],
    )

    unread = 0
    for row in visible:
        last_activity = support_repository.query_last_activity_at(row)
        read_at = read_map.get(row.id)
        if read_at is None or read_at < last_activity:
            unread += 1
    return unread


def mark_query_viewed(
    db: Session,
    *,
    current_user: object,
    query_key: str,
) -> SupportMarkViewedResponse:
    tenant_id = resolve_support_tenant_id(db, current_user)
    row = support_repository.resolve_query(db, query_key=query_key, tenant_id=tenant_id)
    if not row or not can_view_query(db, current_user, row):
        raise NotFoundException("Support query", query_key)

    user_id = int(getattr(current_user, "id"))
    last_activity = support_repository.query_last_activity_at(row)
    read_map = support_repository.get_query_read_at_map(
        db,
        user_id=user_id,
        query_ids=[row.id],
    )
    prior = read_map.get(row.id)
    already_viewed = prior is not None and prior >= last_activity

    support_repository.mark_query_read(
        db,
        tenant_id=row.tenant_id,
        query_id=row.id,
        user_id=user_id,
    )
    db.commit()
    return SupportMarkViewedResponse(query_key=row.query_ref, already_viewed=already_viewed)


def list_queries(
    db: Session,
    *,
    current_user: object,
    page: int,
    size: int,
    search: str | None,
    category: str | None,
    status: str | None,
) -> SupportQueryListResponse:
    tenant_id = resolve_support_tenant_id(db, current_user)
    rows, total = support_repository.list_queries(
        db,
        tenant_id=tenant_id,
        page=page,
        size=size,
        search=search,
        category=category,
        status=status,
    )
    visible = [row for row in rows if can_view_query(db, current_user, row)]
    items = _build_query_responses_for_user(db, current_user=current_user, rows=visible)
    return SupportQueryListResponse(items=items, total=len(items), page=page, size=size)


def get_query(db: Session, *, current_user: object, query_key: str) -> SupportQueryResponse:
    tenant_id = resolve_support_tenant_id(db, current_user)
    row = support_repository.resolve_query(db, query_key=query_key, tenant_id=tenant_id)
    if not row or not can_view_query(db, current_user, row):
        raise NotFoundException("Support query", query_key)
    user_id = int(getattr(current_user, "id"))
    read_map = support_repository.get_query_read_at_map(
        db,
        user_id=user_id,
        query_ids=[row.id],
    )
    return _build_query_response(
        db,
        row,
        is_viewed=_query_is_viewed(row, read_map.get(row.id)),
    )


def create_query(
    db: Session,
    *,
    current_user: object,
    payload: SupportQueryCreateRequest,
) -> SupportQueryResponse:
    tenant_id = require_tenant_id(current_user)
    actor_role = resolve_actor_role(db, current_user)
    if not actor_role or actor_role == "STUDENT":
        raise ForbiddenException("Not authorized to create queries")

    _validate_category(payload.category.strip())

    row = support_repository.create_query(
        db,
        tenant_id=tenant_id,
        category=payload.category.strip(),
        subject=payload.subject.strip(),
        description=payload.description.strip(),
        status="Open",
        created_by_role=actor_role,
        user_id=int(getattr(current_user, "id")),
    )

    support_repository.add_query_message(
        db,
        tenant_id=tenant_id,
        query_id=row.id,
        author_user_id=int(getattr(current_user, "id")),
        author_role=actor_role,
        body=payload.description.strip(),
    )

    _auto_mark_query_read(db, row=row, user_id=int(getattr(current_user, "id")))

    db.commit()
    db.refresh(row)
    return _build_query_response(db, row, is_viewed=True)


def update_query(
    db: Session,
    *,
    current_user: object,
    query_key: str,
    payload: SupportQueryUpdateRequest,
) -> SupportQueryResponse:
    tenant_id = resolve_support_tenant_id(db, current_user)
    row = support_repository.resolve_query(db, query_key=query_key, tenant_id=tenant_id)
    if not row or not can_view_query(db, current_user, row):
        raise NotFoundException("Support query", query_key)

    if payload.status is not None:
        _validate_query_status(payload.status)
    if payload.category is not None:
        _validate_category(payload.category.strip())

    if not is_query_owner(db, current_user, row) and payload.status is None:
        raise ForbiddenException("Only the query owner can edit query details")

    updates: dict = {}
    if payload.category is not None:
        updates["category"] = payload.category.strip()
    if payload.subject is not None:
        updates["subject"] = payload.subject.strip()
    if payload.description is not None:
        updates["description"] = payload.description.strip()
    if payload.status is not None:
        updates["status"] = payload.status

    support_repository.update_query_row(
        db,
        row,
        user_id=int(getattr(current_user, "id")),
        updates=updates,
    )
    _auto_mark_query_read(db, row=row, user_id=int(getattr(current_user, "id")))
    db.commit()
    db.refresh(row)
    return _build_query_response(db, row, is_viewed=True)


def delete_query(db: Session, *, current_user: object, query_key: str) -> None:
    tenant_id = resolve_support_tenant_id(db, current_user)
    row = support_repository.resolve_query(db, query_key=query_key, tenant_id=tenant_id)
    if not row or not can_view_query(db, current_user, row):
        raise NotFoundException("Support query", query_key)
    if not is_query_owner(db, current_user, row):
        raise ForbiddenException("Only the query owner can delete this query")

    if row.attachment_file_path:
        delete_query_attachment_file(row.attachment_file_path)

    support_repository.soft_delete_query(db, row, user_id=int(getattr(current_user, "id")))
    db.commit()


def add_query_message(
    db: Session,
    *,
    current_user: object,
    query_key: str,
    payload: SupportQueryMessageCreateRequest,
) -> SupportQueryResponse:
    tenant_id = resolve_support_tenant_id(db, current_user)
    row = support_repository.resolve_query(db, query_key=query_key, tenant_id=tenant_id)
    if not row or not can_view_query(db, current_user, row):
        raise NotFoundException("Support query", query_key)

    actor_role = resolve_actor_role(db, current_user)
    if not actor_role:
        raise ForbiddenException("Not authorized")

    if payload.status is not None:
        _validate_query_status(payload.status)

    support_repository.add_query_message(
        db,
        tenant_id=row.tenant_id,
        query_id=row.id,
        author_user_id=int(getattr(current_user, "id")),
        author_role=actor_role,
        body=payload.body.strip(),
    )

    if payload.status is not None:
        support_repository.update_query_row(
            db,
            row,
            user_id=int(getattr(current_user, "id")),
            updates={"status": payload.status},
        )

    _auto_mark_query_read(db, row=row, user_id=int(getattr(current_user, "id")))

    db.commit()
    db.refresh(row)
    return _build_query_response(db, row, is_viewed=True)


def update_query_message(
    db: Session,
    *,
    current_user: object,
    query_key: str,
    message_id: int,
    payload: SupportQueryMessageUpdateRequest,
) -> SupportQueryResponse:
    tenant_id = resolve_support_tenant_id(db, current_user)
    row = support_repository.resolve_query(db, query_key=query_key, tenant_id=tenant_id)
    if not row or not can_view_query(db, current_user, row):
        raise NotFoundException("Support query", query_key)

    message = support_repository.get_query_message(
        db,
        query_id=row.id,
        message_id=message_id,
    )
    if not message:
        raise NotFoundException("Support query message", str(message_id))

    user_id = int(getattr(current_user, "id"))
    if message.author_user_id != user_id:
        raise ForbiddenException("Only the message author can edit this message")

    support_repository.update_query_message_body(db, message, body=payload.body.strip())
    support_repository.update_query_row(db, row, user_id=user_id, updates={})
    _auto_mark_query_read(db, row=row, user_id=user_id)
    db.commit()
    db.refresh(row)
    return _build_query_response(db, row, is_viewed=True)


def delete_query_message(
    db: Session,
    *,
    current_user: object,
    query_key: str,
    message_id: int,
) -> SupportQueryResponse:
    tenant_id = resolve_support_tenant_id(db, current_user)
    row = support_repository.resolve_query(db, query_key=query_key, tenant_id=tenant_id)
    if not row or not can_view_query(db, current_user, row):
        raise NotFoundException("Support query", query_key)

    message = support_repository.get_query_message(
        db,
        query_id=row.id,
        message_id=message_id,
    )
    if not message:
        raise NotFoundException("Support query message", str(message_id))

    user_id = int(getattr(current_user, "id"))
    if message.author_user_id != user_id:
        raise ForbiddenException("Only the message author can delete this message")

    support_repository.delete_query_message_row(db, message)
    support_repository.update_query_row(db, row, user_id=user_id, updates={})
    _auto_mark_query_read(db, row=row, user_id=user_id)
    db.commit()
    db.refresh(row)
    return _build_query_response(db, row, is_viewed=True)


def forward_query(db: Session, *, current_user: object, query_key: str) -> SupportQueryResponse:
    tenant_id = resolve_support_tenant_id(db, current_user)
    row = support_repository.resolve_query(db, query_key=query_key, tenant_id=tenant_id)
    if not row:
        raise NotFoundException("Support query", query_key)
    if not can_forward_query(db, current_user, row):
        raise ForbiddenException("Not authorized to forward this query")

    support_repository.forward_query(db, row, user_id=int(getattr(current_user, "id")))
    _auto_mark_query_read(db, row=row, user_id=int(getattr(current_user, "id")))
    db.commit()
    db.refresh(row)
    return _build_query_response(db, row, is_viewed=True)


def upload_query_attachment(
    db: Session,
    *,
    current_user: object,
    query_key: str,
    file_name: str,
    content: bytes,
    content_type: str | None,
) -> SupportQueryResponse:
    tenant_id = resolve_support_tenant_id(db, current_user)
    row = support_repository.resolve_query(db, query_key=query_key, tenant_id=tenant_id)
    if not row or not is_query_owner(db, current_user, row):
        raise NotFoundException("Support query", query_key)

    if row.attachment_file_path:
        delete_query_attachment_file(row.attachment_file_path)

    stored_path, file_type = save_query_attachment_file(
        tenant_id=row.tenant_id,
        query_id=row.id,
        file_name=file_name,
        content=content,
        content_type=content_type,
    )
    file_size_kb = max(1, len(content) // 1024)

    support_repository.set_query_attachment(
        db,
        row,
        file_name=file_name,
        file_path=stored_path,
        file_type=file_type,
        file_size_kb=file_size_kb,
        user_id=int(getattr(current_user, "id")),
    )
    db.commit()
    db.refresh(row)
    return _build_query_response(db, row, is_viewed=True)


def list_release_notes(
    db: Session,
    *,
    current_user: object,
    page: int,
    size: int,
    search: str | None,
) -> ReleaseNoteListResponse:
    rows, total = support_repository.list_release_notes(
        db,
        page=page,
        size=size,
        search=search,
    )
    visible = [row for row in rows if can_view_release_note(db, current_user, row)]
    items = [_build_release_note_response(db, row) for row in visible]
    return ReleaseNoteListResponse(items=items, total=len(items), page=page, size=size)


def get_release_note(db: Session, *, current_user: object, note_id: int) -> ReleaseNoteResponse:
    row = support_repository.get_release_note_by_id(db, note_id)
    if not row or not can_view_release_note(db, current_user, row):
        raise NotFoundException("Release note", note_id)
    return _build_release_note_response(db, row)


def create_release_note(
    db: Session,
    *,
    current_user: object,
    payload: ReleaseNoteCreateRequest,
) -> ReleaseNoteResponse:
    if not payload.show_to.admin and not payload.show_to.teacher and not payload.show_to.student:
        raise ValidationException("Please select at least one user role.")

    version = payload.version.strip()
    row = support_repository.create_release_note(
        db,
        title=f"Release {version}",
        version=version,
        release_date=payload.release_date,
        description=payload.description.strip(),
        status="Done",
        show_to_admin=payload.show_to.admin,
        show_to_teacher=payload.show_to.teacher,
        show_to_student=payload.show_to.student,
        user_id=int(getattr(current_user, "id")),
    )
    db.commit()
    db.refresh(row)
    return _build_release_note_response(db, row)


def update_release_note(
    db: Session,
    *,
    current_user: object,
    note_id: int,
    payload: ReleaseNoteUpdateRequest,
) -> ReleaseNoteResponse:
    row = support_repository.get_release_note_by_id(db, note_id)
    if not row:
        raise NotFoundException("Release note", note_id)

    updates: dict = {}
    if payload.version is not None:
        version = payload.version.strip()
        updates["version"] = version
        updates["title"] = f"Release {version}"
    if payload.release_date is not None:
        updates["release_date"] = payload.release_date
    if payload.description is not None:
        updates["description"] = payload.description.strip()
    if payload.show_to is not None:
        if not payload.show_to.admin and not payload.show_to.teacher and not payload.show_to.student:
            raise ValidationException("Please select at least one user role.")
        updates["show_to_admin"] = payload.show_to.admin
        updates["show_to_teacher"] = payload.show_to.teacher
        updates["show_to_student"] = payload.show_to.student

    support_repository.update_release_note_row(
        db,
        row,
        user_id=int(getattr(current_user, "id")),
        updates=updates,
    )
    db.commit()
    db.refresh(row)
    return _build_release_note_response(db, row)


def delete_release_note(db: Session, *, current_user: object, note_id: int) -> None:
    row = support_repository.get_release_note_by_id(db, note_id)
    if not row:
        raise NotFoundException("Release note", note_id)

    if row.file_path:
        delete_release_note_file(row.file_path)

    support_repository.soft_delete_release_note(db, row, user_id=int(getattr(current_user, "id")))
    db.commit()


def upload_release_note_attachment(
    db: Session,
    *,
    current_user: object,
    note_id: int,
    file_name: str,
    content: bytes,
    content_type: str | None,
) -> ReleaseNoteResponse:
    row = support_repository.get_release_note_by_id(db, note_id)
    if not row:
        raise NotFoundException("Release note", note_id)

    if row.file_path:
        delete_release_note_file(row.file_path)

    stored_path, file_type = save_release_note_file(
        note_id=row.id,
        file_name=file_name,
        content=content,
        content_type=content_type,
    )
    file_size_kb = max(1, len(content) // 1024)

    support_repository.update_release_note_row(
        db,
        row,
        user_id=int(getattr(current_user, "id")),
        updates={
            "file_name": file_name,
            "file_path": stored_path,
            "file_type": file_type,
            "file_size_kb": file_size_kb,
        },
    )
    db.commit()
    db.refresh(row)
    return _build_release_note_response(db, row)
