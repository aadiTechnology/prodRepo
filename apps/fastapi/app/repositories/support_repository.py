from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.models.support import SupportQuery, SupportQueryMessage, SupportQueryRead, SupportReleaseNote
from app.models.user import User


def get_user_display_name(db: Session, user_id: int | None) -> str | None:
    if user_id is None:
        return None
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None
    return user.full_name or str(user.email)


def next_query_ref(db: Session, *, tenant_id: int) -> str:
    count = (
        db.query(func.count(SupportQuery.id))
        .filter(SupportQuery.tenant_id == tenant_id)
        .scalar()
        or 0
    )
    return f"QRY-{count + 1:03d}"


def resolve_query(
    db: Session,
    *,
    query_key: str,
    tenant_id: int | None,
) -> SupportQuery | None:
    query = (
        db.query(SupportQuery)
        .options(joinedload(SupportQuery.messages))
        .filter(SupportQuery.is_deleted == False)  # noqa: E712
    )
    if tenant_id is not None:
        query = query.filter(SupportQuery.tenant_id == tenant_id)
    if query_key.upper().startswith("QRY-"):
        return query.filter(SupportQuery.query_ref == query_key.upper()).first()
    if query_key.isdigit():
        return query.filter(SupportQuery.id == int(query_key)).first()
    return None


def list_queries(
    db: Session,
    *,
    tenant_id: int | None,
    page: int,
    size: int,
    search: str | None,
    category: str | None,
    status: str | None,
) -> tuple[list[SupportQuery], int]:
    query = (
        db.query(SupportQuery)
        .options(joinedload(SupportQuery.messages))
        .filter(SupportQuery.is_deleted == False)  # noqa: E712
    )
    if tenant_id is not None:
        query = query.filter(SupportQuery.tenant_id == tenant_id)
    if category:
        query = query.filter(SupportQuery.category == category)
    if status:
        query = query.filter(SupportQuery.status == status)
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                SupportQuery.query_ref.ilike(term),
                SupportQuery.subject.ilike(term),
                SupportQuery.category.ilike(term),
                SupportQuery.description.ilike(term),
            )
        )

    total = query.count()
    rows = (
        query.order_by(SupportQuery.created_at.desc())
        .offset(page * size)
        .limit(size)
        .all()
    )
    return rows, total


def create_query(
    db: Session,
    *,
    tenant_id: int,
    category: str,
    subject: str,
    description: str,
    status: str,
    created_by_role: str,
    user_id: int,
) -> SupportQuery:
    row = SupportQuery(
        tenant_id=tenant_id,
        query_ref=next_query_ref(db, tenant_id=tenant_id),
        category=category,
        subject=subject,
        description=description,
        status=status,
        created_by_role=created_by_role,
        created_by=user_id,
    )
    db.add(row)
    db.flush()
    return row


def update_query_row(
    db: Session,
    row: SupportQuery,
    *,
    user_id: int,
    updates: dict,
) -> SupportQuery:
    for key, value in updates.items():
        if value is not None:
            setattr(row, key, value)
    row.updated_by = user_id
    row.updated_at = datetime.utcnow()
    db.flush()
    return row


def soft_delete_query(db: Session, row: SupportQuery, *, user_id: int) -> None:
    row.is_deleted = True
    row.deleted_at = datetime.utcnow()
    row.deleted_by = user_id
    db.flush()


def add_query_message(
    db: Session,
    *,
    tenant_id: int,
    query_id: int,
    author_user_id: int,
    author_role: str,
    body: str,
) -> SupportQueryMessage:
    row = SupportQueryMessage(
        tenant_id=tenant_id,
        query_id=query_id,
        author_user_id=author_user_id,
        author_role=author_role,
        body=body,
    )
    db.add(row)
    db.flush()
    return row


def get_query_message(
    db: Session,
    *,
    query_id: int,
    message_id: int,
) -> SupportQueryMessage | None:
    return (
        db.query(SupportQueryMessage)
        .filter(
            SupportQueryMessage.id == message_id,
            SupportQueryMessage.query_id == query_id,
        )
        .first()
    )


def update_query_message_body(
    db: Session,
    message: SupportQueryMessage,
    *,
    body: str,
) -> SupportQueryMessage:
    message.body = body
    db.flush()
    return message


def delete_query_message_row(db: Session, message: SupportQueryMessage) -> None:
    db.delete(message)
    db.flush()


def forward_query(
    db: Session,
    row: SupportQuery,
    *,
    user_id: int,
) -> SupportQuery:
    row.forwarded_to_super_admin = True
    row.forwarded_by = user_id
    row.forwarded_at = datetime.utcnow()
    row.updated_by = user_id
    row.updated_at = datetime.utcnow()
    db.flush()
    return row


def set_query_attachment(
    db: Session,
    row: SupportQuery,
    *,
    file_name: str,
    file_path: str,
    file_type: str,
    file_size_kb: int,
    user_id: int,
) -> SupportQuery:
    row.attachment_file_name = file_name
    row.attachment_file_path = file_path
    row.attachment_file_type = file_type
    row.attachment_file_size_kb = file_size_kb
    row.updated_by = user_id
    row.updated_at = datetime.utcnow()
    db.flush()
    return row


def query_last_activity_at(row: SupportQuery) -> datetime:
    times: list[datetime] = [row.created_at]
    if row.messages:
        times.extend(msg.created_at for msg in row.messages)
    last_msg_at = max((msg.created_at for msg in row.messages), default=row.created_at)
    if row.forwarded_at:
        times.append(row.forwarded_at)
    if row.updated_at and row.updated_at > last_msg_at:
        times.append(row.updated_at)
    return max(times)


def get_query_read_at_map(
    db: Session,
    *,
    user_id: int,
    query_ids: list[int],
) -> dict[int, datetime]:
    if not query_ids:
        return {}
    rows = (
        db.query(SupportQueryRead.query_id, SupportQueryRead.read_at)
        .filter(
            SupportQueryRead.user_id == user_id,
            SupportQueryRead.query_id.in_(query_ids),
        )
        .all()
    )
    return {int(query_id): read_at for query_id, read_at in rows}


def mark_query_read(
    db: Session,
    *,
    tenant_id: int,
    query_id: int,
    user_id: int,
    read_at: datetime | None = None,
) -> SupportQueryRead:
    now = read_at or datetime.utcnow()
    existing = (
        db.query(SupportQueryRead)
        .filter(
            SupportQueryRead.tenant_id == tenant_id,
            SupportQueryRead.query_id == query_id,
            SupportQueryRead.user_id == user_id,
        )
        .first()
    )
    if existing:
        existing.read_at = now
        db.flush()
        return existing

    row = SupportQueryRead(
        tenant_id=tenant_id,
        query_id=query_id,
        user_id=user_id,
        read_at=now,
    )
    db.add(row)
    db.flush()
    return row


def list_queries_for_unread_count(
    db: Session,
    *,
    tenant_id: int | None,
) -> list[SupportQuery]:
    query = (
        db.query(SupportQuery)
        .options(joinedload(SupportQuery.messages))
        .filter(SupportQuery.is_deleted == False)  # noqa: E712
    )
    if tenant_id is not None:
        query = query.filter(SupportQuery.tenant_id == tenant_id)
    return query.all()


def list_release_notes(
    db: Session,
    *,
    page: int,
    size: int,
    search: str | None,
) -> tuple[list[SupportReleaseNote], int]:
    query = db.query(SupportReleaseNote).filter(
        SupportReleaseNote.is_deleted == False  # noqa: E712
    )
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                SupportReleaseNote.title.ilike(term),
                SupportReleaseNote.version.ilike(term),
                SupportReleaseNote.description.ilike(term),
            )
        )

    total = query.count()
    rows = (
        query.order_by(
            SupportReleaseNote.release_date.desc(),
            SupportReleaseNote.created_at.desc(),
        )
        .offset(page * size)
        .limit(size)
        .all()
    )
    return rows, total


def get_release_note_by_id(db: Session, note_id: int) -> SupportReleaseNote | None:
    return (
        db.query(SupportReleaseNote)
        .filter(
            SupportReleaseNote.id == note_id,
            SupportReleaseNote.is_deleted == False,  # noqa: E712
        )
        .first()
    )


def create_release_note(
    db: Session,
    *,
    title: str,
    version: str,
    release_date: date,
    description: str,
    status: str,
    show_to_admin: bool,
    show_to_teacher: bool,
    show_to_student: bool,
    user_id: int,
) -> SupportReleaseNote:
    row = SupportReleaseNote(
        title=title,
        version=version,
        release_date=release_date,
        description=description,
        status=status,
        show_to_admin=show_to_admin,
        show_to_teacher=show_to_teacher,
        show_to_student=show_to_student,
        created_by=user_id,
    )
    db.add(row)
    db.flush()
    return row


def update_release_note_row(
    db: Session,
    row: SupportReleaseNote,
    *,
    user_id: int,
    updates: dict,
) -> SupportReleaseNote:
    for key, value in updates.items():
        if value is not None:
            setattr(row, key, value)
    row.updated_by = user_id
    row.updated_at = datetime.utcnow()
    db.flush()
    return row


def soft_delete_release_note(db: Session, row: SupportReleaseNote, *, user_id: int) -> None:
    row.is_deleted = True
    row.deleted_at = datetime.utcnow()
    row.deleted_by = user_id
    db.flush()
