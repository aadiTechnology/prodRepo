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
                subject_id INT NULL,
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
    db.execute(
        text(
            """
            IF COL_LENGTH('dbo.teacher_assignments', 'subject_id') IS NULL
            BEGIN
                ALTER TABLE dbo.teacher_assignments
                ADD subject_id INT NULL;
            END
            """
        )
    )


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
          AND c.is_active = 1
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
          AND c.is_active = 1
          AND cd.is_active = 1
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
    if tenant_id is None:
        return []
    query = text(
        """
        SELECT
            t.id,
            NULLIF(LTRIM(RTRIM(t.full_name)), '') AS full_name
        FROM teachers t
        WHERE t.is_active = 1
          AND t.is_deleted = 0
          AND t.tenant_id = :tenant_id
        ORDER BY NULLIF(LTRIM(RTRIM(t.full_name)), '') ASC
        """
    )
    try:
        rows = db.execute(query, {"tenant_id": tenant_id}).mappings().all()
        return [{"id": r["id"], "full_name": r["full_name"]} for r in rows]
    except SQLAlchemyError:
        return []


def _designation_from_subject_id(subject_id: Optional[int]) -> str:
    return "Subject Teacher" if subject_id is not None else "Class Teacher"


def _assignment_list_merge_key(row: dict) -> tuple:
    """
    Class-teacher rows: merge multiple divisions assigned in one save (same class/year).
    Subject-teacher rows: one list row per division+subject (same teacher may teach many classes).
    """
    if row.get("subject_id") is None:
        return (
            "class_teacher",
            row["teacher_id"],
            row["class_id"],
            row["academic_year_id"],
        )
    return (
        "subject_teacher",
        row["teacher_id"],
        row["class_id"],
        row["academic_year_id"],
        row["subject_id"],
        row["class_division_id"],
    )


def get_assigned_map(
    db: Session,
    tenant_id: Optional[int],
    academic_year_id: int,
) -> dict:
    assignment_query = text(
        """
        SELECT
            ta.class_id,
            ta.class_division_id
        FROM teacher_assignments ta
        INNER JOIN classes c ON c.id = ta.class_id
                             AND c.is_deleted = 0
                             AND c.is_active = 1
        LEFT JOIN class_divisions cd ON cd.id = ta.class_division_id
        WHERE ta.is_active = 1
          AND ta.subject_id IS NULL
          AND ta.academic_year_id = :academic_year_id
          AND (ta.class_division_id IS NULL OR cd.is_active = 1)
          AND (:tenant_id IS NULL OR ta.tenant_id = :tenant_id)
        """
    )
    legacy_query = text(
        """
        SELECT
            t.class_id,
            t.class_division_id
        FROM teachers t
        INNER JOIN classes c ON c.id = t.class_id
                             AND c.is_deleted = 0
                             AND c.is_active = 1
        LEFT JOIN class_divisions cd ON cd.id = t.class_division_id
        WHERE t.is_active = 1
          AND t.is_deleted = 0
          AND t.class_id IS NOT NULL
          AND c.academic_year_id = :academic_year_id
          AND (t.class_division_id IS NULL OR cd.is_active = 1)
          AND (:tenant_id IS NULL OR t.tenant_id = :tenant_id)
        """
    )
    try:
        _ensure_teacher_assignments_table(db)
        rows = db.execute(
            assignment_query,
            {"tenant_id": tenant_id, "academic_year_id": academic_year_id},
        ).mappings().all()
    except SQLAlchemyError:
        rows = []

    try:
        legacy_rows = db.execute(
            legacy_query,
            {"tenant_id": tenant_id, "academic_year_id": academic_year_id},
        ).mappings().all()
    except SQLAlchemyError:
        legacy_rows = []

    class_division_ids = sorted(
        {
            int(r["class_division_id"])
            for r in [*rows, *legacy_rows]
            if r.get("class_division_id") is not None
        }
    )
    all_class_divisions_query = text(
        """
        SELECT
            c.id AS class_id,
            cd.id AS class_division_id
        FROM classes c
        INNER JOIN class_divisions cd ON cd.class_id = c.id
        WHERE c.is_deleted = 0
          AND c.is_active = 1
          AND cd.is_active = 1
          AND c.academic_year_id = :academic_year_id
          AND (:tenant_id IS NULL OR c.tenant_id = :tenant_id)
        """
    )
    try:
        all_class_divisions = db.execute(
            all_class_divisions_query,
            {"tenant_id": tenant_id, "academic_year_id": academic_year_id},
        ).mappings().all()
    except SQLAlchemyError:
        all_class_divisions = []

    divisions_by_class: dict[int, set[int]] = {}
    for row in all_class_divisions:
        class_id = row.get("class_id")
        division_id = row.get("class_division_id")
        if class_id is None or division_id is None:
            continue
        divisions_by_class.setdefault(int(class_id), set()).add(int(division_id))

    assigned_division_set = set(class_division_ids)
    class_ids = sorted(
        [
            class_id
            for class_id, division_set in divisions_by_class.items()
            if division_set and division_set.issubset(assigned_division_set)
        ]
    )

    return {"class_ids": class_ids, "class_division_ids": class_division_ids}


def assign_teacher(
    db: Session,
    tenant_id: Optional[int],
    academic_year_id: int,
    class_id: int,
    class_division_id: Optional[int],
    teacher_id: int,
    subject_id: Optional[int] = None,
    class_division_ids: Optional[list[int]] = None,
) -> dict:
    from fastapi import HTTPException
    from app.services.school_class_service import require_active_class, require_active_division

    if tenant_id is None:
        raise HTTPException(status_code=400, detail="Tenant is required")
    require_active_class(db, tenant_id, class_id)
    division_ids = class_division_ids or ([class_division_id] if class_division_id is not None else [])
    for div_id in division_ids:
        require_active_division(db, tenant_id, class_id, div_id)

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
          AND (
              (:subject_id IS NULL AND subject_id IS NULL)
              OR subject_id = :subject_id
          )
          AND is_active = 1
        ORDER BY id DESC
        """
    )

    update_query = text(
        """
        UPDATE teacher_assignments
        SET teacher_id = :teacher_id,
            subject_id = :subject_id,
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
            subject_id,
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
            :subject_id,
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

        division_ids = class_division_ids or [class_division_id]
        division_ids = [int(d) for d in division_ids if d is not None]
        if not division_ids:
            return {"message": "At least one division is required", "assignment_id": None}

        first_assignment_id: Optional[int] = None
        changed_existing = False
        for division_id in division_ids:
            params = {
                "tenant_id": effective_tenant_id,
                "academic_year_id": academic_year_id,
                "class_id": class_id,
                "class_division_id": division_id,
                "teacher_id": teacher_id,
                "subject_id": subject_id,
            }

            existing = db.execute(find_query, params).mappings().first()
            if existing:
                changed_existing = True
                db.execute(
                    update_query,
                    {
                        "id": existing["id"],
                        "teacher_id": teacher_id,
                        "subject_id": subject_id,
                    },
                )
                if first_assignment_id is None:
                    first_assignment_id = existing["id"]
            else:
                inserted_id = db.execute(insert_query, params).scalar() or None
                if first_assignment_id is None:
                    first_assignment_id = inserted_id

        db.commit()
        if changed_existing:
            return {
                "message": "Teacher reassigned successfully",
                "assignment_id": first_assignment_id,
            }
        return {
            "message": "Teacher assigned successfully",
            "assignment_id": first_assignment_id,
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
    subject_id: Optional[int] = None,
) -> dict:
    if subject_id is not None:
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
              AND ta.subject_id = :subject_id
              AND ta.is_active = 1
            ORDER BY ta.updated_at DESC, ta.id DESC
            """
        )
    else:
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
              AND ta.subject_id IS NULL
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
        query_params = {
            "tenant_id": tenant_id,
            "class_id": class_id,
            "division_id": division_id,
            "academic_year_id": academic_year_id,
        }
        if subject_id is not None:
            query_params["subject_id"] = subject_id

        row = db.execute(query, query_params).mappings().first()
        if row and row["teacher_id"] is not None:
            return {"is_assigned": True, "teacher_name": row["teacher_name"]}

        if subject_id is not None:
            return {"is_assigned": False, "teacher_name": None}

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
    def _fetch_merged_rows(for_tenant_id: Optional[int]) -> list[dict]:
        params = {
            "tenant_id": for_tenant_id,
            "search_like": search_like,
        }

        try:
            _ensure_teacher_assignments_table(db)
            assignment_rows = db.execute(assignment_rows_query, params).mappings().all()
        except SQLAlchemyError:
            assignment_rows = []

        try:
            legacy_rows = db.execute(legacy_rows_query, params).mappings().all()
        except SQLAlchemyError:
            legacy_rows = []

        merged_by_key: dict[tuple, dict] = {}
        for row in assignment_rows:
            key = _assignment_list_merge_key(row)
            if key not in merged_by_key:
                merged_by_key[key] = {
                    "id": row["id"],
                    "academic_year_id": row["academic_year_id"],
                    "class_id": row["class_id"],
                    "class_division_id": row["class_division_id"],
                    "class_division_ids": [row["class_division_id"]] if row["class_division_id"] else [],
                    "class_name": row["class_name"],
                    "division_name": row["division_name"] or "",
                    "teacher_id": row["teacher_id"],
                    "teacher_name": row["teacher_name"],
                    "subject_id": row.get("subject_id"),
                    "subject_name": row.get("subject_name"),
                    "designation": _designation_from_subject_id(row.get("subject_id")),
                    "status": row["status"],
                }
            else:
                if row["class_division_id"] and row["class_division_id"] not in merged_by_key[key]["class_division_ids"]:
                    merged_by_key[key]["class_division_ids"].append(row["class_division_id"])
                division_name = row["division_name"] or ""
                existing_names = [x.strip() for x in str(merged_by_key[key]["division_name"]).split(",") if x.strip()]
                if division_name and division_name not in existing_names:
                    existing_names.append(division_name)
                    merged_by_key[key]["division_name"] = ", ".join(existing_names)

        for row in legacy_rows:
            key = _assignment_list_merge_key({**row, "subject_id": row.get("subject_id")})
            if key not in merged_by_key:
                merged_by_key[key] = {
                    "id": row["id"],
                    "academic_year_id": row["academic_year_id"],
                    "class_id": row["class_id"],
                    "class_division_id": row["class_division_id"],
                    "class_division_ids": [row["class_division_id"]] if row["class_division_id"] else [],
                    "class_name": row["class_name"],
                    "division_name": row["division_name"],
                    "teacher_id": row["teacher_id"],
                    "teacher_name": row["teacher_name"],
                    "subject_id": row.get("subject_id"),
                    "subject_name": row.get("subject_name"),
                    "designation": _designation_from_subject_id(row.get("subject_id")),
                    "status": row["status"],
                }
            else:
                if row["class_division_id"] and row["class_division_id"] not in merged_by_key[key]["class_division_ids"]:
                    merged_by_key[key]["class_division_ids"].append(row["class_division_id"])
                division_name = row["division_name"] or ""
                existing_names = [x.strip() for x in str(merged_by_key[key]["division_name"]).split(",") if x.strip()]
                if division_name and division_name not in existing_names:
                    existing_names.append(division_name)
                    merged_by_key[key]["division_name"] = ", ".join(existing_names)

        merged_rows = sorted(
            merged_by_key.values(),
            key=lambda item: (
                (item["teacher_name"] or "").upper(),
                (item["class_name"] or "").upper(),
                (item["division_name"] or "").upper(),
                item["id"] or 0,
            ),
        )
        for item in merged_rows:
            item["class_division_ids"] = sorted(
                [int(v) for v in item.get("class_division_ids", []) if v is not None]
            )
        return merged_rows

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
            ta.subject_id AS subject_id,
            s.name AS subject_name,
            'ASSIGNED' AS status
        FROM teacher_assignments ta
        INNER JOIN teachers t ON t.id = ta.teacher_id
                             AND t.is_active = 1
                             AND t.is_deleted = 0
        INNER JOIN classes c ON c.id = ta.class_id
                             AND c.is_deleted = 0
                             AND c.is_active = 1
        LEFT JOIN class_divisions cd ON cd.id = ta.class_division_id
        LEFT JOIN subjects s ON s.id = ta.subject_id
                            AND s.is_deleted = 0
        WHERE ta.is_active = 1
          AND (ta.class_division_id IS NULL OR cd.is_active = 1)
          AND (:tenant_id IS NULL OR ta.tenant_id = :tenant_id)
          AND (:search_like IS NULL
               OR c.name LIKE :search_like
               OR cd.division_name LIKE :search_like
               OR s.name LIKE :search_like
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
            NULL AS subject_id,
            NULL AS subject_name,
            'ASSIGNED' AS status
        FROM teachers t
        INNER JOIN classes c ON c.id = t.class_id
                             AND c.is_deleted = 0
                             AND c.is_active = 1
        LEFT JOIN class_divisions cd ON cd.id = t.class_division_id
        WHERE t.is_active = 1
          AND t.is_deleted = 0
          AND t.class_id IS NOT NULL
          AND (t.class_division_id IS NULL OR cd.is_active = 1)
          AND (:tenant_id IS NULL OR t.tenant_id = :tenant_id)
          AND (:search_like IS NULL
               OR c.name LIKE :search_like
               OR cd.division_name LIKE :search_like
               OR NULLIF(LTRIM(RTRIM(t.full_name)), '') LIKE :search_like)
        ORDER BY c.name ASC, cd.division_name ASC, t.id ASC
        """
    )

    merged_rows = _fetch_merged_rows(tenant_id)
    if len(merged_rows) == 0 and tenant_id is not None:
        merged_rows = _fetch_merged_rows(None)
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
            ta.teacher_id,
            ta.subject_id
        FROM teacher_assignments ta
        INNER JOIN teachers t ON t.id = ta.teacher_id
                             AND t.is_deleted = 0
        WHERE ta.id = :assignment_id
          AND ta.is_active = 1
          AND (:tenant_id IS NULL OR ta.tenant_id = :tenant_id)
        """
    )
    grouped_divisions_query = text(
        """
        SELECT ta.class_division_id
        FROM teacher_assignments ta
        WHERE ta.teacher_id = :teacher_id
          AND ta.class_id = :class_id
          AND ta.academic_year_id = :academic_year_id
          AND (
              (:subject_id IS NULL AND ta.subject_id IS NULL)
              OR ta.subject_id = :subject_id
          )
          AND ta.is_active = 1
          AND (:tenant_id IS NULL OR ta.tenant_id = :tenant_id)
        ORDER BY ta.class_division_id ASC
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
        class_division_ids = [
            r["class_division_id"]
            for r in db.execute(
                grouped_divisions_query,
                {
                    "teacher_id": row["teacher_id"],
                    "class_id": row["class_id"],
                    "academic_year_id": row["academic_year_id"],
                    "subject_id": row.get("subject_id"),
                    "tenant_id": tenant_id,
                },
            ).mappings().all()
            if r["class_division_id"] is not None
        ]
        if not class_division_ids and row["class_division_id"] is not None:
            class_division_ids = [row["class_division_id"]]
        return {
            "assignment_id": row["assignment_id"],
            "academic_year_id": row["academic_year_id"],
            "class_id": row["class_id"],
            "class_division_id": row["class_division_id"],
            "class_division_ids": class_division_ids,
            "teacher_id": row["teacher_id"],
            "subject_id": row.get("subject_id"),
        }
    except SQLAlchemyError:
        return None


def update_teacher_assignment(
    db: Session,
    tenant_id: Optional[int],
    assignment_id: int,
    academic_year_id: int,
    class_id: int,
    class_division_id: Optional[int],
    teacher_id: int,
    subject_id: Optional[int] = None,
    class_division_ids: Optional[list[int]] = None,
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
        SELECT TOP 1 ta.id, ta.teacher_id, ta.class_id, ta.academic_year_id, ta.subject_id
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
            subject_id = :subject_id,
            updated_at = GETDATE()
        WHERE id = :assignment_id
        """
    )
    deactivate_existing_for_group_query = text(
        """
        UPDATE teacher_assignments
        SET is_active = 0,
            updated_at = GETDATE()
        WHERE teacher_id = :teacher_id
          AND class_id = :class_id
          AND academic_year_id = :academic_year_id
          AND (
              (:subject_id IS NULL AND subject_id IS NULL)
              OR subject_id = :subject_id
          )
          AND (:tenant_id IS NULL OR tenant_id = :tenant_id)
          AND is_active = 1
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

        division_ids = class_division_ids or [class_division_id]
        division_ids = [int(d) for d in division_ids if d is not None]
        if not division_ids:
            return {"message": "At least one division is required", "assignment_id": None}

        if assignment_row:
            db.execute(
                deactivate_existing_for_group_query,
                {
                    "teacher_id": assignment_row["teacher_id"],
                    "class_id": assignment_row["class_id"],
                    "academic_year_id": assignment_row["academic_year_id"],
                    "subject_id": assignment_row.get("subject_id"),
                    "tenant_id": tenant_id,
                },
            )
            new_result = assign_teacher(
                db=db,
                tenant_id=effective_tenant_id,
                academic_year_id=academic_year_id,
                class_id=class_id,
                class_division_id=division_ids[0],
                teacher_id=teacher_id,
                subject_id=subject_id,
                class_division_ids=division_ids,
            )
            if new_result["assignment_id"] is None:
                return {"message": "Unable to update teacher assignment", "assignment_id": None}
            db.commit()
            return {
                "message": "Teacher assignment updated successfully",
                "assignment_id": new_result["assignment_id"],
            }

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
            class_division_id=division_ids[0],
            teacher_id=teacher_id,
            subject_id=subject_id,
            class_division_ids=division_ids,
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
