from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models.notice import Notice, NoticeAttachment, NoticeTarget


def list_notices(
    db: Session,
    *,
    tenant_id: int,
    search: str | None,
    audience_type: str | None,
    notice_type: str | None,
    is_published: bool | None,
    page: int,
    size: int,
) -> tuple[list[dict], int]:
    where_sql = ["tenant_id = :tenant_id", "is_deleted = 0"]
    params: dict = {"tenant_id": tenant_id}

    if search:
        where_sql.append("(title LIKE :search OR description LIKE :search)")
        params["search"] = f"%{search.strip()}%"
    if audience_type:
        where_sql.append("audience_type = :audience_type")
        params["audience_type"] = audience_type
    if notice_type:
        where_sql.append("notice_type = :notice_type")
        params["notice_type"] = notice_type
    if is_published is not None:
        where_sql.append("is_published = :is_published")
        params["is_published"] = 1 if is_published else 0

    where_clause = " AND ".join(where_sql)
    params["offset"] = page * size
    params["size"] = size

    list_sql = text(
        f"""
        SELECT *
        FROM notices
        WHERE {where_clause}
        ORDER BY created_at DESC, id DESC
        OFFSET :offset ROWS FETCH NEXT :size ROWS ONLY
        """
    )
    count_sql = text(f"SELECT COUNT(1) FROM notices WHERE {where_clause}")

    rows = db.execute(list_sql, params).mappings().all()
    total = db.execute(count_sql, params).scalar() or 0
    return [dict(r) for r in rows], int(total)


def get_notice_by_id(db: Session, *, tenant_id: int, notice_id: int) -> dict | None:
    sql = text(
        """
        SELECT *
        FROM notices
        WHERE id = :notice_id AND tenant_id = :tenant_id AND is_deleted = 0
        """
    )
    row = db.execute(sql, {"notice_id": notice_id, "tenant_id": tenant_id}).mappings().first()
    return dict(row) if row else None


def get_notice_targets(db: Session, *, notice_id: int) -> list[dict]:
    sql = text(
        """
        SELECT id, class_id, division_id
        FROM notice_targets
        WHERE notice_id = :notice_id
        ORDER BY id ASC
        """
    )
    rows = db.execute(sql, {"notice_id": notice_id}).mappings().all()
    return [dict(r) for r in rows]


def get_notice_attachments(db: Session, *, notice_id: int) -> list[dict]:
    sql = text(
        """
        SELECT id, file_name, file_path, file_type, uploaded_at
        FROM notice_attachments
        WHERE notice_id = :notice_id
        ORDER BY id ASC
        """
    )
    rows = db.execute(sql, {"notice_id": notice_id}).mappings().all()
    return [dict(r) for r in rows]


def insert_notice(db: Session, *, payload: dict) -> int:
    entity = Notice(**payload)
    db.add(entity)
    db.flush()
    return int(entity.id)


def replace_notice_targets(db: Session, *, notice_id: int, targets: list[dict]) -> None:
    db.query(NoticeTarget).filter(NoticeTarget.notice_id == notice_id).delete()
    if targets:
        db.bulk_insert_mappings(NoticeTarget, [{"notice_id": notice_id, **t} for t in targets])


def replace_notice_attachments(db: Session, *, notice_id: int, attachments: list[dict]) -> None:
    db.query(NoticeAttachment).filter(NoticeAttachment.notice_id == notice_id).delete()
    if attachments:
        db.bulk_insert_mappings(
            NoticeAttachment,
            [{"notice_id": notice_id, **a} for a in attachments],
        )


def update_notice(db: Session, *, tenant_id: int, notice_id: int, update_fields: dict) -> None:
    if not update_fields:
        return
    set_parts: list[str] = []
    params: dict = {"notice_id": notice_id, "tenant_id": tenant_id}
    for key, value in update_fields.items():
        set_parts.append(f"{key} = :{key}")
        params[key] = value
    sql = text(
        f"""
        UPDATE notices
        SET {", ".join(set_parts)}
        WHERE id = :notice_id AND tenant_id = :tenant_id AND is_deleted = 0
        """
    )
    db.execute(sql, params)
