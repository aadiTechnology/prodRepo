from __future__ import annotations

from datetime import date, datetime
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.services.activity_gallery_access import GalleryViewerContext, is_gallery_consumer


def _apply_scope_visibility(
    where_sql: list[str],
    params: dict,
    viewer_context: GalleryViewerContext | None,
) -> None:
    if not viewer_context or viewer_context.kind == "admin":
        return

    if is_gallery_consumer(viewer_context):
        where_sql.append("g.is_published = 1")

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
                  SELECT 1 FROM activity_gallery_class_mapping m
                  WHERE m.gallery_id = g.id
                  AND m.class_id = :vc_{idx}_class
                  AND m.division_id = :vc_{idx}_div
                )"""
            )
        else:
            scope_clauses.append(
                f"""EXISTS (
                  SELECT 1 FROM activity_gallery_class_mapping m
                  WHERE m.gallery_id = g.id
                  AND m.class_id = :vc_{idx}_class
                )"""
            )
    where_sql.append(f"({' OR '.join(scope_clauses)})")


def list_galleries(
    db: Session,
    *,
    tenant_id: int,
    gallery_type: str | None,
    search: str | None,
    skip: int,
    limit: int,
    viewer_context: GalleryViewerContext | None = None,
) -> tuple[list[dict], int]:
    where_sql = ["g.tenant_id = :tenant_id", "g.status = 1"]
    params: dict[str, Any] = {"tenant_id": tenant_id}

    _apply_scope_visibility(where_sql, params, viewer_context)

    if gallery_type:
        where_sql.append("g.gallery_type = :gallery_type")
        params["gallery_type"] = gallery_type
    if search:
        where_sql.append("g.gallery_name LIKE :search")
        params["search"] = f"%{search.strip()}%"

    where_clause = " AND ".join(where_sql)
    params["offset"] = skip
    params["limit"] = limit

    list_sql = text(
        f"""
        SELECT
            g.id,
            g.tenant_id,
            g.gallery_name,
            g.gallery_type,
            g.description,
            g.activity_date,
            g.is_published,
            g.created_at,
            g.updated_at,
            m.class_id,
            m.division_id,
            c.name AS class_name,
            cd.division_name,
            ISNULL((
                SELECT COUNT(1)
                FROM activity_gallery_media gm
                WHERE gm.gallery_id = g.id
                  AND gm.status = 1
                  AND gm.media_type = 'Photo'
            ), 0) AS photo_count,
            ISNULL((
                SELECT COUNT(1)
                FROM activity_gallery_media gm
                WHERE gm.gallery_id = g.id
                  AND gm.status = 1
                  AND gm.media_type = 'Video'
            ), 0) AS video_count
        FROM activity_gallery g
        OUTER APPLY (
            SELECT TOP 1 cm.class_id, cm.division_id
            FROM activity_gallery_class_mapping cm
            WHERE cm.gallery_id = g.id
            ORDER BY cm.id ASC
        ) m
        LEFT JOIN classes c ON c.id = m.class_id
        LEFT JOIN class_divisions cd ON cd.id = m.division_id
        WHERE {where_clause}
        ORDER BY g.updated_at DESC, g.id DESC
        OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
        """
    )
    count_sql = text(
        f"""
        SELECT COUNT(1)
        FROM activity_gallery g
        WHERE {where_clause}
        """
    )

    rows = db.execute(list_sql, params).mappings().all()
    total = db.execute(count_sql, params).scalar() or 0
    return [dict(r) for r in rows], int(total)


def get_gallery_by_id(
    db: Session,
    *,
    tenant_id: int,
    gallery_id: int,
) -> dict | None:
    sql = text(
        """
        SELECT
            g.id,
            g.tenant_id,
            g.gallery_name,
            g.gallery_type,
            g.description,
            g.activity_date,
            g.created_by,
            g.is_published,
            g.status,
            g.created_at,
            g.updated_at,
            m.class_id,
            m.division_id,
            c.name AS class_name,
            cd.division_name
        FROM activity_gallery g
        OUTER APPLY (
            SELECT TOP 1 cm.class_id, cm.division_id
            FROM activity_gallery_class_mapping cm
            WHERE cm.gallery_id = g.id
            ORDER BY cm.id ASC
        ) m
        LEFT JOIN classes c ON c.id = m.class_id
        LEFT JOIN class_divisions cd ON cd.id = m.division_id
        WHERE g.id = :gallery_id
          AND g.tenant_id = :tenant_id
          AND g.status = 1
        """
    )
    row = db.execute(sql, {"gallery_id": gallery_id, "tenant_id": tenant_id}).mappings().first()
    return dict(row) if row else None


def get_class_mappings(db: Session, *, gallery_id: int) -> list[dict]:
    sql = text(
        """
        SELECT
            m.id,
            m.gallery_id,
            m.class_id,
            m.division_id,
            m.created_at,
            c.name AS class_name,
            cd.division_name
        FROM activity_gallery_class_mapping m
        LEFT JOIN classes c ON c.id = m.class_id
        LEFT JOIN class_divisions cd ON cd.id = m.division_id
        WHERE m.gallery_id = :gallery_id
        ORDER BY m.id ASC
        """
    )
    rows = db.execute(sql, {"gallery_id": gallery_id}).mappings().all()
    return [dict(r) for r in rows]


def get_media_items(db: Session, *, gallery_id: int, media_type: str | None = None) -> list[dict]:
    where = ["gallery_id = :gallery_id", "status = 1"]
    params: dict[str, Any] = {"gallery_id": gallery_id}
    if media_type:
        where.append("media_type = :media_type")
        params["media_type"] = media_type

    sql = text(
        f"""
        SELECT
            id,
            gallery_id,
            media_type,
            file_name,
            original_file_name,
            file_path,
            file_size,
            display_order,
            uploaded_at
        FROM activity_gallery_media
        WHERE {' AND '.join(where)}
        ORDER BY display_order ASC, id ASC
        """
    )
    rows = db.execute(sql, params).mappings().all()
    return [dict(r) for r in rows]


def sum_media_file_size(db: Session, *, gallery_id: int, media_type: str) -> int:
    sql = text(
        """
        SELECT ISNULL(SUM(file_size), 0)
        FROM activity_gallery_media
        WHERE gallery_id = :gallery_id
          AND media_type = :media_type
          AND status = 1
        """
    )
    return int(
        db.execute(sql, {"gallery_id": gallery_id, "media_type": media_type}).scalar() or 0
    )


def count_media_by_type(db: Session, *, gallery_id: int, media_type: str) -> int:
    sql = text(
        """
        SELECT COUNT(1)
        FROM activity_gallery_media
        WHERE gallery_id = :gallery_id
          AND media_type = :media_type
          AND status = 1
        """
    )
    return int(db.execute(sql, {"gallery_id": gallery_id, "media_type": media_type}).scalar() or 0)


def insert_gallery(
    db: Session,
    *,
    tenant_id: int,
    gallery_name: str,
    gallery_type: str,
    description: str | None,
    activity_date: date,
    created_by: int,
) -> int:
    now = datetime.utcnow()
    sql = text(
        """
        INSERT INTO activity_gallery (
            tenant_id, gallery_name, gallery_type, description,
            activity_date, created_by, is_published, status, created_at, updated_at
        )
        OUTPUT INSERTED.id
        VALUES (
            :tenant_id, :gallery_name, :gallery_type, :description,
            :activity_date, :created_by, 0, 1, :created_at, :updated_at
        )
        """
    )
    gallery_id = db.execute(
        sql,
        {
            "tenant_id": tenant_id,
            "gallery_name": gallery_name,
            "gallery_type": gallery_type,
            "description": description,
            "activity_date": activity_date,
            "created_by": created_by,
            "created_at": now,
            "updated_at": now,
        },
    ).scalar_one()
    db.commit()
    return int(gallery_id)


def replace_class_mappings(
    db: Session,
    *,
    gallery_id: int,
    targets: list[tuple[int, int]],
) -> None:
    db.execute(
        text("DELETE FROM activity_gallery_class_mapping WHERE gallery_id = :gallery_id"),
        {"gallery_id": gallery_id},
    )
    now = datetime.utcnow()
    for class_id, division_id in targets:
        db.execute(
            text(
                """
                INSERT INTO activity_gallery_class_mapping (gallery_id, class_id, division_id, created_at)
                VALUES (:gallery_id, :class_id, :division_id, :created_at)
                """
            ),
            {
                "gallery_id": gallery_id,
                "class_id": class_id,
                "division_id": division_id,
                "created_at": now,
            },
        )
    db.commit()


def update_gallery(
    db: Session,
    *,
    gallery_id: int,
    tenant_id: int,
    updates: dict[str, Any] | None = None,
) -> None:
    updates = dict(updates or {})
    updates["updated_at"] = datetime.utcnow()
    set_clause = ", ".join(f"{key} = :{key}" for key in updates)
    params = {**updates, "gallery_id": gallery_id, "tenant_id": tenant_id}
    sql = text(
        f"""
        UPDATE activity_gallery
        SET {set_clause}
        WHERE id = :gallery_id AND tenant_id = :tenant_id AND status = 1
        """
    )
    db.execute(sql, params)
    db.commit()


def soft_delete_gallery(db: Session, *, gallery_id: int, tenant_id: int) -> None:
    db.execute(
        text(
            """
            UPDATE activity_gallery
            SET status = 0, updated_at = :updated_at
            WHERE id = :gallery_id AND tenant_id = :tenant_id
            """
        ),
        {
            "gallery_id": gallery_id,
            "tenant_id": tenant_id,
            "updated_at": datetime.utcnow(),
        },
    )
    db.commit()


def publish_gallery(db: Session, *, gallery_id: int, tenant_id: int) -> None:
    db.execute(
        text(
            """
            UPDATE activity_gallery
            SET is_published = 1, updated_at = :updated_at
            WHERE id = :gallery_id AND tenant_id = :tenant_id AND status = 1
            """
        ),
        {
            "gallery_id": gallery_id,
            "tenant_id": tenant_id,
            "updated_at": datetime.utcnow(),
        },
    )
    db.commit()


def insert_media(
    db: Session,
    *,
    gallery_id: int,
    media_type: str,
    file_name: str,
    original_file_name: str | None,
    file_path: str,
    file_size: int | None,
    display_order: int,
) -> int:
    sql = text(
        """
        INSERT INTO activity_gallery_media (
            gallery_id, media_type, file_name, original_file_name,
            file_path, file_size, display_order, uploaded_at, status
        )
        OUTPUT INSERTED.id
        VALUES (
            :gallery_id, :media_type, :file_name, :original_file_name,
            :file_path, :file_size, :display_order, :uploaded_at, 1
        )
        """
    )
    media_id = db.execute(
        sql,
        {
            "gallery_id": gallery_id,
            "media_type": media_type,
            "file_name": file_name,
            "original_file_name": original_file_name,
            "file_path": file_path,
            "file_size": file_size,
            "display_order": display_order,
            "uploaded_at": datetime.utcnow(),
        },
    ).scalar_one()
    db.commit()
    return int(media_id)


def get_media_by_id(
    db: Session,
    *,
    gallery_id: int,
    media_id: int,
) -> dict | None:
    sql = text(
        """
        SELECT *
        FROM activity_gallery_media
        WHERE id = :media_id
          AND gallery_id = :gallery_id
          AND status = 1
        """
    )
    row = db.execute(sql, {"media_id": media_id, "gallery_id": gallery_id}).mappings().first()
    return dict(row) if row else None


def soft_delete_media(db: Session, *, gallery_id: int, media_id: int) -> dict | None:
    row = get_media_by_id(db, gallery_id=gallery_id, media_id=media_id)
    if not row:
        return None
    db.execute(
        text(
            """
            UPDATE activity_gallery_media
            SET status = 0
            WHERE id = :media_id AND gallery_id = :gallery_id
            """
        ),
        {"media_id": media_id, "gallery_id": gallery_id},
    )
    db.commit()
    return row


def has_active_academic_year(db: Session, *, tenant_id: int) -> bool:
    sql = text(
        """
        SELECT TOP 1 1
        FROM academic_years
        WHERE tenant_id = :tenant_id
          AND is_active = 1
          AND is_deleted = 0
        """
    )
    return db.execute(sql, {"tenant_id": tenant_id}).scalar() is not None
