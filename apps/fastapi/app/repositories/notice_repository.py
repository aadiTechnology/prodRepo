from __future__ import annotations

from datetime import datetime

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models.notice import Notice, NoticeAttachment, NoticeTarget
from app.services.notice_access import NoticeViewerContext, is_notice_consumer


def _append_effective_status_filter(
    where_sql: list[str],
    params: dict,
    status: str,
    *,
    table_alias: str = "n",
) -> None:
    """Match list chips / detail view via the same rules as notice_service._effective_notice_status."""
    normalized = status.strip().upper()
    if not normalized:
        return

    now = datetime.utcnow()
    params["effective_status_now"] = now
    table = table_alias

    if normalized == "EXPIRED":
        where_sql.append(f"({table}.expiry_date IS NOT NULL AND {table}.expiry_date < :effective_status_now)")
    elif normalized == "DRAFT":
        where_sql.append(
            f"({table}.status = 'DRAFT' "
            f"AND ({table}.expiry_date IS NULL OR {table}.expiry_date >= :effective_status_now))"
        )
    elif normalized == "UNPUBLISHED":
        where_sql.append(
            f"(({table}.expiry_date IS NULL OR {table}.expiry_date >= :effective_status_now) "
            f"AND ({table}.status = 'UNPUBLISHED' "
            f"OR ({table}.status = 'PUBLISHED' AND {table}.publish_date > :effective_status_now)))"
        )
    elif normalized == "PUBLISHED":
        where_sql.append(
            f"(({table}.expiry_date IS NULL OR {table}.expiry_date >= :effective_status_now) "
            f"AND {table}.status NOT IN ('DRAFT', 'UNPUBLISHED', 'EXPIRED') "
            f"AND {table}.publish_date <= :effective_status_now)"
        )
    else:
        params["status"] = normalized
        where_sql.append(f"{table}.status = :status")


def _apply_consumer_visibility(
    where_sql: list[str],
    params: dict,
    viewer_context: NoticeViewerContext | None,
) -> None:
    if not viewer_context or not is_notice_consumer(viewer_context):
        return

    now = datetime.utcnow()
    params["viewer_now"] = now
    where_sql.append("n.status = 'PUBLISHED'")
    where_sql.append("n.is_published = 1")
    where_sql.append("(n.expiry_date IS NULL OR n.expiry_date >= :viewer_now)")

    if viewer_context.kind == "teacher":
        where_sql.append("n.audience_type IN ('TEACHER', 'ALL')")
    elif viewer_context.kind in ("student", "parent"):
        where_sql.append("n.audience_type IN ('STUDENT', 'ALL')")
        scopes = viewer_context.scopes
        if not scopes:
            where_sql.append("1 = 0")
            return
        scope_clauses: list[str] = []
        for idx, scope in enumerate(scopes):
            params[f"vc_{idx}_class"] = scope.class_id
            if scope.class_division_id is not None:
                params[f"vc_{idx}_div"] = scope.class_division_id
                scope_clauses.append(
                    f"""EXISTS (
                      SELECT 1 FROM communication_notice_targets t
                      WHERE t.notice_id = n.id AND t.is_deleted = 0
                      AND (
                        t.division_id = :vc_{idx}_div
                        OR (t.class_id = :vc_{idx}_class AND t.division_id IS NULL)
                      )
                    )"""
                )
            else:
                scope_clauses.append(
                    f"""EXISTS (
                      SELECT 1 FROM communication_notice_targets t
                      WHERE t.notice_id = n.id AND t.is_deleted = 0
                      AND t.class_id = :vc_{idx}_class
                    )"""
                )
        where_sql.append(f"({' OR '.join(scope_clauses)})")


def list_notices(
    db: Session,
    *,
    tenant_id: int,
    search: str | None,
    audience_type: str | None,
    notice_type: str | None,
    status: str | None,
    is_published: bool | None,
    page: int,
    size: int,
    viewer_context: NoticeViewerContext | None = None,
) -> tuple[list[dict], int]:
    where_sql = ["n.tenant_id = :tenant_id", "n.is_deleted = 0"]
    params: dict = {"tenant_id": tenant_id}

    _apply_consumer_visibility(where_sql, params, viewer_context)

    if search:
        where_sql.append("n.title LIKE :search")
        params["search"] = f"%{search.strip()}%"
    if audience_type:
        where_sql.append("n.audience_type = :audience_type")
        params["audience_type"] = audience_type
    if notice_type:
        where_sql.append("n.notice_type = :notice_type")
        params["notice_type"] = notice_type
    if status:
        _append_effective_status_filter(where_sql, params, status)
    if is_published is not None:
        where_sql.append("n.is_published = :is_published")
        params["is_published"] = 1 if is_published else 0

    where_clause = " AND ".join(where_sql)
    params["offset"] = page * size
    params["size"] = size

    list_sql = text(
        f"""
        SELECT n.*
        FROM communication_notices n
        WHERE {where_clause}
        ORDER BY n.created_at DESC, n.id DESC
        OFFSET :offset ROWS FETCH NEXT :size ROWS ONLY
        """
    )
    count_sql = text(f"SELECT COUNT(1) FROM communication_notices n WHERE {where_clause}")

    rows = db.execute(list_sql, params).mappings().all()
    total = db.execute(count_sql, params).scalar() or 0
    return [dict(r) for r in rows], int(total)


def get_notice_by_id(db: Session, *, tenant_id: int, notice_id: int) -> dict | None:
    sql = text(
        """
        SELECT *
        FROM communication_notices
        WHERE id = :notice_id AND tenant_id = :tenant_id AND is_deleted = 0
        """
    )
    row = db.execute(sql, {"notice_id": notice_id, "tenant_id": tenant_id}).mappings().first()
    return dict(row) if row else None


def get_notice_targets(db: Session, *, notice_id: int) -> list[dict]:
    sql = text(
        """
        SELECT id, tenant_id, notice_id, class_id, division_id, created_at, created_by
        FROM communication_notice_targets
        WHERE notice_id = :notice_id AND is_deleted = 0
        ORDER BY id ASC
        """
    )
    rows = db.execute(sql, {"notice_id": notice_id}).mappings().all()
    return [dict(r) for r in rows]


def get_notice_attachment(
    db: Session,
    *,
    tenant_id: int,
    notice_id: int,
    attachment_id: int,
) -> dict | None:
    sql = text(
        """
        SELECT id, tenant_id, notice_id, file_name, file_path, file_type, file_size_kb, uploaded_at, uploaded_by
        FROM communication_notice_attachments
        WHERE id = :attachment_id AND notice_id = :notice_id AND tenant_id = :tenant_id AND is_deleted = 0
        """
    )
    row = (
        db.execute(
            sql,
            {"attachment_id": attachment_id, "notice_id": notice_id, "tenant_id": tenant_id},
        )
        .mappings()
        .first()
    )
    return dict(row) if row else None


def get_notice_attachments(db: Session, *, notice_id: int) -> list[dict]:
    sql = text(
        """
        SELECT id, tenant_id, notice_id, file_name, file_path, file_type, file_size_kb, uploaded_at, uploaded_by
        FROM communication_notice_attachments
        WHERE notice_id = :notice_id AND is_deleted = 0
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


def replace_notice_targets(
    db: Session,
    *,
    tenant_id: int,
    notice_id: int,
    user_id: int,
    targets: list[dict],
) -> None:
    db.query(NoticeTarget).filter(NoticeTarget.notice_id == notice_id).delete()
    if targets:
        db.bulk_insert_mappings(
            NoticeTarget,
            [
                {
                    "tenant_id": tenant_id,
                    "notice_id": notice_id,
                    "class_id": t.get("class_id"),
                    "division_id": t.get("division_id"),
                    "created_by": user_id,
                    "is_deleted": False,
                }
                for t in targets
            ],
        )


def replace_notice_attachments(
    db: Session,
    *,
    tenant_id: int,
    notice_id: int,
    user_id: int,
    attachments: list[dict],
) -> None:
    db.query(NoticeAttachment).filter(NoticeAttachment.notice_id == notice_id).delete()
    if attachments:
        db.bulk_insert_mappings(
            NoticeAttachment,
            [
                {
                    "tenant_id": tenant_id,
                    "notice_id": notice_id,
                    "file_name": a.get("file_name") or "",
                    "file_path": a.get("file_path") or "",
                    "file_type": a.get("file_type") or "",
                    "file_size_kb": a.get("file_size_kb"),
                    "uploaded_by": user_id,
                    "is_deleted": False,
                }
                for a in attachments
            ],
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
        UPDATE communication_notices
        SET {", ".join(set_parts)}
        WHERE id = :notice_id AND tenant_id = :tenant_id AND is_deleted = 0
        """
    )
    db.execute(sql, params)
