from typing import Optional

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session


def _ensure_teacher_assignments_table(db: Session) -> None:
    """
    Ensure mapping table exists for multi-class teacher assignments.
    """
    create_table_query = text(
        """
        IF OBJECT_ID('dbo.teacher_assignments', 'U') IS NULL
        BEGIN
            CREATE TABLE dbo.teacher_assignments (
                id INT IDENTITY(1,1) PRIMARY KEY,
                tenant_id INT NOT NULL,
                academic_year_id INT NOT NULL,
                class_id INT NOT NULL,
                class_division_id INT NOT NULL,
                teacher_id INT NOT NULL,
                is_active BIT NOT NULL DEFAULT(1),
                created_at DATETIME NOT NULL DEFAULT(GETDATE()),
                updated_at DATETIME NOT NULL DEFAULT(GETDATE())
            );

            CREATE INDEX IX_teacher_assignments_lookup
            ON dbo.teacher_assignments (
                tenant_id,
                academic_year_id,
                class_id,
                class_division_id,
                is_active
            );
        END
        """
    )
    db.execute(create_table_query)


def get_academic_years(db: Session, tenant_id: Optional[int]) -> list[dict]:
    query = text(
        """
        SELECT
            ay.id,
            ay.name
        FROM academic_years ay
        WHERE ay.is_active = 1
          AND ay.is_deleted = 0
          AND (:tenant_id IS NULL OR ay.tenant_id = :tenant_id)
        ORDER BY ay.start_date DESC, ay.id DESC
        """
    )
    try:
        rows = db.execute(query, {"tenant_id": tenant_id}).mappings().all()
        return [{"id": r["id"], "name": r["name"]} for r in rows]
    except SQLAlchemyError:
        return []


def get_classes(db: Session, tenant_id: Optional[int], academic_year_id: int) -> list[dict]:
    query = text(
        """
        SELECT
            c.id,
            c.name
        FROM classes c
        WHERE c.is_deleted = 0
          AND (:tenant_id IS NULL OR c.tenant_id = :tenant_id)
          AND c.academic_year_id = :academic_year_id
        ORDER BY c.name ASC
        """
    )
    try:
        rows = db.execute(
            query,
            {"tenant_id": tenant_id, "academic_year_id": academic_year_id},
        ).mappings().all()
        return [{"id": r["id"], "name": r["name"]} for r in rows]
    except SQLAlchemyError:
        return []


def get_divisions(db: Session, tenant_id: Optional[int], class_id: int) -> list[dict]:
    query = text(
        """
        SELECT
            cd.id,
            cd.division_name
        FROM class_divisions cd
        INNER JOIN classes c ON c.id = cd.class_id
        WHERE c.is_deleted = 0
          AND c.id = :class_id
          AND (:tenant_id IS NULL OR c.tenant_id = :tenant_id)
        ORDER BY cd.division_name ASC
        """
    )
    try:
        rows = db.execute(
            query,
            {"tenant_id": tenant_id, "class_id": class_id},
        ).mappings().all()
        return [{"id": r["id"], "division_name": r["division_name"]} for r in rows]
    except SQLAlchemyError:
        return []


def get_teachers(db: Session, tenant_id: Optional[int]) -> list[dict]:
    query = text(
        """
        SELECT
            t.id,
            NULLIF(LTRIM(RTRIM(t.full_name)), '') AS full_name
        FROM teachers t
        WHERE t.is_active = 1
          AND t.is_deleted = 0
        ORDER BY NULLIF(LTRIM(RTRIM(t.full_name)), '') ASC
        """
    )
    try:
        rows = db.execute(query, {"tenant_id": tenant_id}).mappings().all()
        return [{"id": r["id"], "full_name": r["full_name"]} for r in rows]
    except SQLAlchemyError:
        return []


def assign_teacher(
    db: Session,
    tenant_id: Optional[int],
    academic_year_id: int,
    class_id: int,
    class_division_id: int,
    teacher_id: int,
) -> dict:
    teacher_exists_query = text(
        """
        SELECT TOP 1 t.id, t.tenant_id
        FROM teachers t
        WHERE t.id = :teacher_id
          AND t.is_deleted = 0
        """
    )

    find_query = text(
        """
        SELECT TOP 1 id
        FROM teacher_assignments
        WHERE tenant_id = :tenant_id
          AND academic_year_id = :academic_year_id
          AND class_id = :class_id
          AND class_division_id = :class_division_id
          AND is_active = 1
        ORDER BY id DESC
        """
    )

    update_query = text(
        """
        UPDATE teacher_assignments
        SET teacher_id = :teacher_id,
            updated_at = GETDATE()
        WHERE id = :id
        """
    )

    insert_query = text(
        """
        INSERT INTO teacher_assignments (
            tenant_id,
            academic_year_id,
            class_id,
            class_division_id,
            teacher_id,
            is_active,
            created_at,
            updated_at
        )
        OUTPUT INSERTED.id
        VALUES (
            :tenant_id,
            :academic_year_id,
            :class_id,
            :class_division_id,
            :teacher_id,
            1,
            GETDATE(),
            GETDATE()
        )
        """
    )

    try:
        _ensure_teacher_assignments_table(db)
        teacher_exists = db.execute(
            teacher_exists_query,
            {"teacher_id": teacher_id},
        ).mappings().first()
        if not teacher_exists:
            return {"message": "Teacher not found", "assignment_id": None}

        # Some admin tokens may not carry tenant_id; derive it from teacher row.
        effective_tenant_id = tenant_id if tenant_id is not None else teacher_exists["tenant_id"]
        if effective_tenant_id is None:
            return {"message": "Teacher tenant not found", "assignment_id": None}

        params = {
            "tenant_id": effective_tenant_id,
            "academic_year_id": academic_year_id,
            "class_id": class_id,
            "class_division_id": class_division_id,
            "teacher_id": teacher_id,
        }

        existing = db.execute(find_query, params).mappings().first()
        if existing:
            db.execute(update_query, {"id": existing["id"], "teacher_id": teacher_id})
            db.commit()
            return {
                "message": "Teacher reassigned successfully",
                "assignment_id": existing["id"],
            }
        else:
            inserted_id = db.execute(insert_query, params).scalar() or None
            db.commit()
            return {
                "message": "Teacher assigned successfully",
                "assignment_id": inserted_id,
            }
    except SQLAlchemyError:
        db.rollback()
        return {"message": "Unable to assign teacher", "assignment_id": None}


def check_assignment(
    db: Session,
    tenant_id: Optional[int],
    class_id: int,
    division_id: int,
    academic_year_id: int,
) -> dict:
    query = text(
        """
        SELECT TOP 1
            ta.teacher_id,
            NULLIF(LTRIM(RTRIM(t.full_name)), '') AS teacher_name
        FROM teacher_assignments ta
        LEFT JOIN teachers t ON t.id = ta.teacher_id
                         AND t.is_deleted = 0
        WHERE ta.tenant_id = :tenant_id
          AND ta.class_id = :class_id
          AND ta.class_division_id = :division_id
          AND ta.academic_year_id = :academic_year_id
          AND ta.is_active = 1
        ORDER BY ta.updated_at DESC, ta.id DESC
        """
    )
    fallback_query = text(
        """
        SELECT TOP 1
            t.id AS teacher_id,
            NULLIF(LTRIM(RTRIM(t.full_name)), '') AS teacher_name
        FROM teachers t
        WHERE (:tenant_id IS NULL OR t.tenant_id = :tenant_id)
          AND t.is_active = 1
          AND t.is_deleted = 0
          AND (
              t.class_division_id = :division_id
              OR (t.class_division_id IS NULL AND t.class_id = :class_id)
          )
        ORDER BY
            CASE WHEN t.class_division_id = :division_id THEN 0 ELSE 1 END,
            t.updated_at DESC,
            t.id DESC
        """
    )

    try:
        _ensure_teacher_assignments_table(db)
        row = db.execute(
            query,
            {
                "tenant_id": tenant_id,
                "class_id": class_id,
                "division_id": division_id,
                "academic_year_id": academic_year_id,
            },
        ).mappings().first()
        if row and row["teacher_id"] is not None:
            return {"is_assigned": True, "teacher_name": row["teacher_name"]}

        fallback_row = db.execute(
            fallback_query,
            {
                "tenant_id": tenant_id,
                "class_id": class_id,
                "division_id": division_id,
            },
        ).mappings().first()
        if fallback_row and fallback_row["teacher_id"] is not None:
            return {"is_assigned": True, "teacher_name": fallback_row["teacher_name"]}
    except SQLAlchemyError:
        return {"is_assigned": False, "teacher_name": None}

    return {"is_assigned": False, "teacher_name": None}


def get_teacher_assignments(
    db: Session,
    tenant_id: Optional[int],
    page: int = 1,
    limit: int = 10,
    search: Optional[str] = None,
) -> tuple[list[dict], int]:
    offset = (page - 1) * limit
    search_like = f"%{search.strip()}%" if search and search.strip() else None
    assignment_rows_query = text(
        """
        SELECT
            ta.id AS id,
            ta.academic_year_id AS academic_year_id,
            ta.class_id AS class_id,
            ta.class_division_id AS class_division_id,
            c.name AS class_name,
            cd.division_name AS division_name,
            t.id AS teacher_id,
            NULLIF(LTRIM(RTRIM(t.full_name)), '') AS teacher_name,
            'ASSIGNED' AS status
        FROM teacher_assignments ta
        INNER JOIN teachers t ON t.id = ta.teacher_id
                             AND t.is_active = 1
                             AND t.is_deleted = 0
        LEFT JOIN classes c ON c.id = ta.class_id
        LEFT JOIN class_divisions cd ON cd.id = ta.class_division_id
        WHERE ta.is_active = 1
          AND (:tenant_id IS NULL OR ta.tenant_id = :tenant_id)
          AND (:search_like IS NULL
               OR c.name LIKE :search_like
               OR cd.division_name LIKE :search_like
               OR NULLIF(LTRIM(RTRIM(t.full_name)), '') LIKE :search_like)
        ORDER BY c.name ASC, cd.division_name ASC, ta.id ASC
        """
    )

    legacy_rows_query = text(
        """
        SELECT
            COALESCE(t.class_division_id, t.id) AS id,
            c.academic_year_id AS academic_year_id,
            t.class_id AS class_id,
            t.class_division_id AS class_division_id,
            c.name AS class_name,
            cd.division_name AS division_name,
            t.id AS teacher_id,
            NULLIF(LTRIM(RTRIM(t.full_name)), '') AS teacher_name,
            'ASSIGNED' AS status
        FROM teachers t
        LEFT JOIN classes c ON c.id = t.class_id
        LEFT JOIN class_divisions cd ON cd.id = t.class_division_id
        WHERE t.is_active = 1
          AND t.is_deleted = 0
          AND t.class_id IS NOT NULL
          AND (:tenant_id IS NULL OR t.tenant_id = :tenant_id)
          AND (:search_like IS NULL
               OR c.name LIKE :search_like
               OR cd.division_name LIKE :search_like
               OR NULLIF(LTRIM(RTRIM(t.full_name)), '') LIKE :search_like)
        ORDER BY c.name ASC, cd.division_name ASC, t.id ASC
        """
    )

    params = {
        "tenant_id": tenant_id,
        "search_like": search_like,
    }

    # Merge source 1 (teacher_assignments) + source 2 (legacy teacher mapping)
    # and deduplicate by logical class/division key while preferring assignment rows.
    try:
        _ensure_teacher_assignments_table(db)
        assignment_rows = db.execute(assignment_rows_query, params).mappings().all()
    except SQLAlchemyError:
        assignment_rows = []

    try:
        legacy_rows = db.execute(legacy_rows_query, params).mappings().all()
    except SQLAlchemyError:
        legacy_rows = []

    merged_by_key: dict[tuple[str, str], dict] = {}
    for row in assignment_rows:
        key = (
            (row["class_name"] or "").strip().upper(),
            (row["division_name"] or "").strip().upper(),
        )
        merged_by_key[key] = {
            "id": row["id"],
            "academic_year_id": row["academic_year_id"],
            "class_id": row["class_id"],
            "class_division_id": row["class_division_id"],
            "class_name": row["class_name"],
            "division_name": row["division_name"],
            "teacher_id": row["teacher_id"],
            "teacher_name": row["teacher_name"],
            "status": row["status"],
        }

    for row in legacy_rows:
        key = (
            (row["class_name"] or "").strip().upper(),
            (row["division_name"] or "").strip().upper(),
        )
        if key not in merged_by_key:
            merged_by_key[key] = {
                "id": row["id"],
                "academic_year_id": row["academic_year_id"],
                "class_id": row["class_id"],
                "class_division_id": row["class_division_id"],
                "class_name": row["class_name"],
                "division_name": row["division_name"],
                "teacher_id": row["teacher_id"],
                "teacher_name": row["teacher_name"],
                "status": row["status"],
            }

    merged_rows = sorted(
        merged_by_key.values(),
        key=lambda item: (
            (item["class_name"] or "").upper(),
            (item["division_name"] or "").upper(),
            item["id"] or 0,
        ),
    )
    total = len(merged_rows)
    data = merged_rows[offset : offset + limit]

    return data, total


def get_teacher_assignment_by_id(
    db: Session,
    tenant_id: Optional[int],
    assignment_id: int,
) -> Optional[dict]:
    query = text(
        """
        SELECT TOP 1
            ta.id AS assignment_id,
            ta.academic_year_id,
            ta.class_id,
            ta.class_division_id,
            ta.teacher_id
        FROM teacher_assignments ta
        INNER JOIN teachers t ON t.id = ta.teacher_id
                             AND t.is_deleted = 0
        WHERE ta.id = :assignment_id
          AND ta.is_active = 1
          AND (:tenant_id IS NULL OR ta.tenant_id = :tenant_id)
        """
    )
    legacy_query = text(
        """
        SELECT TOP 1
            COALESCE(t.class_division_id, t.id) AS assignment_id,
            c.academic_year_id AS academic_year_id,
            t.class_id AS class_id,
            t.class_division_id AS class_division_id,
            t.id AS teacher_id
        FROM teachers t
        LEFT JOIN classes c ON c.id = t.class_id
        WHERE t.is_active = 1
          AND t.is_deleted = 0
          AND t.class_id IS NOT NULL
          AND (:tenant_id IS NULL OR t.tenant_id = :tenant_id)
          AND (
              t.class_division_id = :assignment_id
              OR t.id = :assignment_id
          )
        ORDER BY
            CASE WHEN t.class_division_id = :assignment_id THEN 0 ELSE 1 END,
            t.updated_at DESC,
            t.id DESC
        """
    )
    try:
        _ensure_teacher_assignments_table(db)
        row = db.execute(
            query,
            {"assignment_id": assignment_id, "tenant_id": tenant_id},
        ).mappings().first()
        if not row:
            row = db.execute(
                legacy_query,
                {"assignment_id": assignment_id, "tenant_id": tenant_id},
            ).mappings().first()
            if not row:
                return None
        return {
            "assignment_id": row["assignment_id"],
            "academic_year_id": row["academic_year_id"],
            "class_id": row["class_id"],
            "class_division_id": row["class_division_id"],
            "teacher_id": row["teacher_id"],
        }
    except SQLAlchemyError:
        return None


def update_teacher_assignment(
    db: Session,
    tenant_id: Optional[int],
    assignment_id: int,
    academic_year_id: int,
    class_id: int,
    class_division_id: int,
    teacher_id: int,
) -> dict:
    teacher_exists_query = text(
        """
        SELECT TOP 1 t.id, t.tenant_id
        FROM teachers t
        WHERE t.id = :teacher_id
          AND t.is_deleted = 0
        """
    )
    find_assignment_query = text(
        """
        SELECT TOP 1 ta.id
        FROM teacher_assignments ta
        WHERE ta.id = :assignment_id
          AND ta.is_active = 1
          AND (:tenant_id IS NULL OR ta.tenant_id = :tenant_id)
        """
    )
    update_assignment_query = text(
        """
        UPDATE teacher_assignments
        SET academic_year_id = :academic_year_id,
            class_id = :class_id,
            class_division_id = :class_division_id,
            teacher_id = :teacher_id,
            updated_at = GETDATE()
        WHERE id = :assignment_id
        """
    )
    legacy_exists_query = text(
        """
        SELECT TOP 1 t.id
        FROM teachers t
        WHERE t.is_active = 1
          AND t.is_deleted = 0
          AND t.class_id IS NOT NULL
          AND (:tenant_id IS NULL OR t.tenant_id = :tenant_id)
          AND (
              t.class_division_id = :assignment_id
              OR t.id = :assignment_id
          )
        ORDER BY
            CASE WHEN t.class_division_id = :assignment_id THEN 0 ELSE 1 END,
            t.updated_at DESC,
            t.id DESC
        """
    )

    try:
        _ensure_teacher_assignments_table(db)
        teacher_exists = db.execute(
            teacher_exists_query,
            {"teacher_id": teacher_id},
        ).mappings().first()
        if not teacher_exists:
            return {"message": "Teacher not found", "assignment_id": None}

        effective_tenant_id = tenant_id if tenant_id is not None else teacher_exists["tenant_id"]
        if effective_tenant_id is None:
            return {"message": "Teacher tenant not found", "assignment_id": None}

        assignment_row = db.execute(
            find_assignment_query,
            {"assignment_id": assignment_id, "tenant_id": tenant_id},
        ).mappings().first()

        if assignment_row:
            db.execute(
                update_assignment_query,
                {
                    "assignment_id": assignment_id,
                    "academic_year_id": academic_year_id,
                    "class_id": class_id,
                    "class_division_id": class_division_id,
                    "teacher_id": teacher_id,
                },
            )
            db.commit()
            return {"message": "Teacher assignment updated successfully", "assignment_id": assignment_id}

        legacy_row = db.execute(
            legacy_exists_query,
            {"assignment_id": assignment_id, "tenant_id": tenant_id},
        ).mappings().first()
        if not legacy_row:
            return {"message": "Teacher assignment not found", "assignment_id": None}

        # Legacy row: perform upsert into teacher_assignments table.
        result = assign_teacher(
            db=db,
            tenant_id=effective_tenant_id,
            academic_year_id=academic_year_id,
            class_id=class_id,
            class_division_id=class_division_id,
            teacher_id=teacher_id,
        )
        if result["assignment_id"] is None:
            return {"message": "Unable to update teacher assignment", "assignment_id": None}
        return {"message": "Teacher assignment updated successfully", "assignment_id": result["assignment_id"]}
    except SQLAlchemyError:
        db.rollback()
        return {"message": "Unable to update teacher assignment", "assignment_id": None}


def unassign_teacher(
    db: Session,
    tenant_id: Optional[int],
    assignment_id: int,
) -> bool:
    deactivate_assignment_query = text(
        """
        UPDATE teacher_assignments
        SET is_active = 0,
            updated_at = GETDATE()
        WHERE id = :assignment_id
          AND (:tenant_id IS NULL OR tenant_id = :tenant_id)
          AND is_active = 1
        """
    )

    try:
        _ensure_teacher_assignments_table(db)
        result = db.execute(
            deactivate_assignment_query,
            {"assignment_id": assignment_id, "tenant_id": tenant_id},
        )
        db.commit()
        return result.rowcount > 0
    except SQLAlchemyError:
        db.rollback()
        return False
