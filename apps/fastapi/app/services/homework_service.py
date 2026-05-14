from __future__ import annotations

import math
from datetime import datetime
from typing import List, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.homework import Homework
from app.schemas.homework_schema import ClassOption, HomeworkCreate, HomeworkResponse, HomeworkUpdate, SubjectOption


def _to_response(hw: Homework) -> HomeworkResponse:
    """Map ORM Homework to HomeworkResponse."""
    return HomeworkResponse(
        id=hw.id,
        tenant_id=hw.tenant_id,
        teacher_id=hw.teacher_id,
        teacher_name=hw.teacher.full_name if hw.teacher else None,
        class_id=hw.class_id,
        class_name=hw.class_model.name if hw.class_model else None,
        class_division_id=hw.class_division_id,
        division_name=hw.division.division_name if hw.division else None,
        subject_id=hw.subject_id,
        subject_name=hw.subject.name if hw.subject else None,
        academic_year_id=hw.academic_year_id,
        academic_year_name=hw.academic_year.name if hw.academic_year else None,
        title=hw.title,
        instructions=hw.instructions,
        assigned_date=hw.assigned_date,
        submission_date=hw.submission_date,
        status=hw.status,
        notify_parents=hw.notify_parents,
        published_at=hw.published_at,
        created_at=hw.created_at,
        updated_at=hw.updated_at,
        attachments=[
            {
                "id": a.id,
                "homework_id": a.homework_id,
                "file_name": a.file_name,
                "file_path": a.file_path,
                "file_type": a.file_type,
                "file_size_kb": a.file_size_kb,
                "uploaded_at": a.uploaded_at,
            }
            for a in hw.attachments
        ],
    )


def _resolve_teacher_id(db: Session, tenant_id: int, user_id: int) -> Optional[int]:
    """
    Return the teacher.id that matches the logged-in user via user_id link.
    Returns None if no teacher profile is linked (caller decides how to handle).
    """
    from app.models.teacher import Teacher

    teacher = (
        db.query(Teacher)
        .filter(
            Teacher.tenant_id == tenant_id,
            Teacher.user_id == user_id,
            Teacher.is_deleted == False,
        )
        .first()
    )
    return teacher.id if teacher else None


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

def list_homework(
    db: Session,
    *,
    tenant_id: int,
    teacher_id: Optional[int] = None,
    class_id: Optional[int] = None,
    class_division_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    academic_year_id: Optional[int] = None,
    hw_status: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 25,
) -> Tuple[List[Homework], int]:
    query = db.query(Homework).filter(
        Homework.tenant_id == tenant_id,
        Homework.is_deleted == False,
    )

    if teacher_id is not None:
        query = query.filter(Homework.teacher_id == teacher_id)
    if class_id is not None:
        query = query.filter(Homework.class_id == class_id)
    if class_division_id is not None:
        query = query.filter(Homework.class_division_id == class_division_id)
    if subject_id is not None:
        query = query.filter(Homework.subject_id == subject_id)
    if academic_year_id is not None:
        query = query.filter(Homework.academic_year_id == academic_year_id)
    if hw_status:
        query = query.filter(Homework.status == hw_status)
    if search:
        query = query.filter(Homework.title.ilike(f"%{search}%"))

    total = query.count()
    items = query.order_by(Homework.created_at.desc()).offset(skip).limit(limit).all()
    return items, total


def get_homework(db: Session, *, tenant_id: int, homework_id: int) -> Homework:
    hw = (
        db.query(Homework)
        .filter(
            Homework.tenant_id == tenant_id,
            Homework.id == homework_id,
            Homework.is_deleted == False,
        )
        .first()
    )
    if not hw:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Homework not found")
    return hw


def create_homework(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    payload: HomeworkCreate,
) -> Homework:
    # Resolve teacher_id: use explicitly provided value first, then auto-resolve from user profile
    if payload.teacher_id:
        teacher_id = payload.teacher_id
    else:
        teacher_id = _resolve_teacher_id(db, tenant_id, user_id)
        if teacher_id is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    "No teacher profile is linked to your account. "
                    "Ask the administrator to link your user account to a teacher profile, "
                    "or provide teacher_id explicitly."
                ),
            )

    # Validate submission date >= assigned date
    if payload.submission_date < payload.assigned_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Submission date cannot be before assigned date",
        )

    now = datetime.utcnow()
    published_at = now if payload.status == "Published" else None

    hw = Homework(
        tenant_id=tenant_id,
        teacher_id=teacher_id,
        class_id=payload.class_id,
        class_division_id=payload.class_division_id,
        subject_id=payload.subject_id,
        academic_year_id=payload.academic_year_id,
        title=payload.title,
        instructions=payload.instructions,
        assigned_date=payload.assigned_date,
        submission_date=payload.submission_date,
        status=payload.status,
        notify_parents=payload.notify_parents,
        published_at=published_at,
        published_by=user_id if payload.status == "Published" else None,
        created_at=now,
        created_by=user_id,
    )
    db.add(hw)
    db.commit()
    db.refresh(hw)
    return hw


def update_homework(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    homework_id: int,
    payload: HomeworkUpdate,
) -> Homework:
    hw = get_homework(db, tenant_id=tenant_id, homework_id=homework_id)

    update_data = payload.model_dump(exclude_unset=True)

    # Validate dates if both are changing
    new_assigned = update_data.get("assigned_date", hw.assigned_date)
    new_submission = update_data.get("submission_date", hw.submission_date)
    if new_submission < new_assigned:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Submission date cannot be before assigned date",
        )

    for key, value in update_data.items():
        setattr(hw, key, value)

    hw.updated_at = datetime.utcnow()
    hw.updated_by = user_id

    # Record publish timestamp when status changes to Published
    if update_data.get("status") == "Published" and not hw.published_at:
        hw.published_at = datetime.utcnow()
        hw.published_by = user_id

    db.commit()
    db.refresh(hw)
    return hw


def delete_homework(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    homework_id: int,
) -> dict:
    hw = get_homework(db, tenant_id=tenant_id, homework_id=homework_id)
    hw.is_deleted = True
    hw.deleted_at = datetime.utcnow()
    hw.deleted_by = user_id
    db.commit()
    return {"message": "Homework deleted successfully"}


# ---------------------------------------------------------------------------
# Attachments
# ---------------------------------------------------------------------------

def add_attachment(
    db: Session,
    *,
    homework_id: int,
    file_name: str,
    file_path: str,
    file_type: Optional[str],
    file_size_kb: Optional[int],
    uploaded_by: int,
):
    from app.models.homework import HomeworkAttachment

    att = HomeworkAttachment(
        homework_id=homework_id,
        file_name=file_name,
        file_path=file_path,
        file_type=file_type,
        file_size_kb=file_size_kb,
        uploaded_at=datetime.utcnow(),
        uploaded_by=uploaded_by,
    )
    db.add(att)
    db.commit()
    db.refresh(att)
    return att


def delete_attachment(
    db: Session,
    *,
    homework_id: int,
    attachment_id: int,
) -> dict:
    from app.models.homework import HomeworkAttachment

    att = (
        db.query(HomeworkAttachment)
        .filter(
            HomeworkAttachment.id == attachment_id,
            HomeworkAttachment.homework_id == homework_id,
        )
        .first()
    )
    if not att:
        from fastapi import HTTPException, status as http_status
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Attachment not found",
        )
    file_path = att.file_path
    db.delete(att)
    db.commit()
    return {"file_path": file_path}


# ---------------------------------------------------------------------------
# Dropdown — classes available for the logged-in teacher (or all for admins)
# ---------------------------------------------------------------------------

def get_classes_for_teacher(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
) -> List[ClassOption]:
    """
    Return distinct classes the teacher is assigned to via teacher_assignments.
    If the user has no linked teacher profile (e.g. tenant admin), returns all
    active classes for the tenant — giving full access.
    """
    from sqlalchemy import text

    teacher_id = _resolve_teacher_id(db, tenant_id, user_id)

    if teacher_id is None:
        # Admin / no teacher profile — return all active classes
        from app.models.academic import SchoolClass
        classes = (
            db.query(SchoolClass)
            .filter(
                SchoolClass.tenant_id == tenant_id,
                SchoolClass.is_active == True,  # noqa: E712
                SchoolClass.is_deleted == False,  # noqa: E712
            )
            .order_by(SchoolClass.name)
            .all()
        )
        return [ClassOption(id=c.id, name=c.name) for c in classes]

    sql = text(
        """
        SELECT DISTINCT c.id, c.name
        FROM teacher_assignments ta
        INNER JOIN classes c ON c.id = ta.class_id
        WHERE ta.tenant_id = :tenant_id
          AND ta.teacher_id = :teacher_id
          AND ta.is_active  = 1
          AND c.is_active   = 1
          AND c.is_deleted  = 0
        ORDER BY c.name
        """
    )
    rows = db.execute(sql, {"tenant_id": tenant_id, "teacher_id": teacher_id}).mappings().all()
    return [ClassOption(id=r["id"], name=r["name"]) for r in rows]


def get_divisions_for_teacher_class(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    class_id: int,
) -> List:
    """
    Return divisions for the given class scoped to what the teacher is assigned to.
    If the user has no teacher profile (admin), returns all divisions for the class.
    """
    from sqlalchemy import text

    teacher_id = _resolve_teacher_id(db, tenant_id, user_id)

    if teacher_id is None:
        # Admin — return all divisions for the class
        sql = text(
            """
            SELECT cd.id, cd.division_name
            FROM class_divisions cd
            INNER JOIN classes c ON c.id = cd.class_id
            WHERE c.id = :class_id
              AND c.is_deleted = 0
              AND c.tenant_id  = :tenant_id
            ORDER BY cd.division_name ASC
            """
        )
        rows = db.execute(sql, {"class_id": class_id, "tenant_id": tenant_id}).mappings().all()
        return [{"id": r["id"], "division_name": r["division_name"]} for r in rows]

    sql = text(
        """
        SELECT DISTINCT cd.id, cd.division_name
        FROM teacher_assignments ta
        INNER JOIN class_divisions cd ON cd.id = ta.class_division_id
        INNER JOIN classes c ON c.id = cd.class_id
        WHERE ta.tenant_id    = :tenant_id
          AND ta.teacher_id   = :teacher_id
          AND ta.class_id     = :class_id
          AND ta.is_active    = 1
          AND c.is_deleted    = 0
        ORDER BY cd.division_name ASC
        """
    )
    rows = db.execute(
        sql, {"tenant_id": tenant_id, "teacher_id": teacher_id, "class_id": class_id}
    ).mappings().all()
    return [{"id": r["id"], "division_name": r["division_name"]} for r in rows]


# ---------------------------------------------------------------------------
# Dropdown — subjects available for a teacher in a given class
# ---------------------------------------------------------------------------

def get_subjects_for_teacher_class(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    class_id: int,
    academic_year_id: Optional[int] = None,
) -> List[SubjectOption]:
    """
    Return the subjects that are assigned to the logged-in teacher for a specific
    class (via teacher_assignments). Falls back to all active subjects for the
    class when no teacher assignment is found.
    """
    from sqlalchemy import text

    teacher_id = _resolve_teacher_id(db, tenant_id, user_id)

    # If no teacher profile linked, fall through straight to class-based fallback
    if teacher_id is None:
        fallback_sql = text(
            """
            SELECT DISTINCT s.id, s.name, s.code
            FROM subjects s
            INNER JOIN subject_classes sc ON sc.subject_id = s.id
            WHERE s.tenant_id = :tenant_id
              AND sc.class_id = :class_id
              AND s.is_active = 1
              AND s.is_deleted = 0
            ORDER BY s.name
            """
        )
        rows = db.execute(fallback_sql, {"tenant_id": tenant_id, "class_id": class_id}).mappings().all()
        return [SubjectOption(id=r["id"], name=r["name"], code=r["code"]) for r in rows]

    params: dict = {
        "tenant_id": tenant_id,
        "teacher_id": teacher_id,
        "class_id": class_id,
    }

    year_clause = ""
    if academic_year_id:
        year_clause = "AND ta.academic_year_id = :academic_year_id"
        params["academic_year_id"] = academic_year_id

    sql = text(
        f"""
        SELECT DISTINCT s.id, s.name, s.code
        FROM teacher_assignments ta
        INNER JOIN subjects s ON s.id = ta.subject_id
        WHERE ta.tenant_id = :tenant_id
          AND ta.teacher_id = :teacher_id
          AND ta.class_id   = :class_id
          AND ta.is_active  = 1
          AND s.is_active   = 1
          AND s.is_deleted  = 0
          {year_clause}
        ORDER BY s.name
        """
    )
    rows = db.execute(sql, params).mappings().all()

    if rows:
        return [SubjectOption(id=r["id"], name=r["name"], code=r["code"]) for r in rows]

    # Fallback: subjects mapped to this class via subject_classes
    fallback_sql = text(
        """
        SELECT DISTINCT s.id, s.name, s.code
        FROM subjects s
        INNER JOIN subject_classes sc ON sc.subject_id = s.id
        WHERE s.tenant_id = :tenant_id
          AND sc.class_id = :class_id
          AND s.is_active = 1
          AND s.is_deleted = 0
        ORDER BY s.name
        """
    )
    fallback_rows = db.execute(fallback_sql, {"tenant_id": tenant_id, "class_id": class_id}).mappings().all()
    return [SubjectOption(id=r["id"], name=r["name"], code=r["code"]) for r in fallback_rows]
