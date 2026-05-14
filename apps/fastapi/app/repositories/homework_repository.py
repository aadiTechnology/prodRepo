from __future__ import annotations

from datetime import datetime, date
from typing import List, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.models.homework import Homework, HomeworkAttachment


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _resolve_teacher_id(db: Session, tenant_id: int, user_id: int) -> Optional[int]:
    """
    Return the teacher.id linked to the given user account.
    Returns None when no teacher profile is linked (admin / other role).
    """
    from app.models.teacher import Teacher

    teacher = (
        db.query(Teacher)
        .filter(
            Teacher.tenant_id == tenant_id,
            Teacher.user_id == user_id,
            Teacher.is_deleted == False,  # noqa: E712
        )
        .first()
    )
    return teacher.id if teacher else None


# ---------------------------------------------------------------------------
# Homework CRUD
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
        Homework.is_deleted == False,  # noqa: E712
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
            Homework.is_deleted == False,  # noqa: E712
        )
        .first()
    )
    if not hw:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Homework details not found",
        )
    return hw


def create_homework(
    db: Session,
    *,
    tenant_id: int,
    teacher_id: int,
    user_id: int,
    class_id: int,
    class_division_id: Optional[int],
    subject_id: int,
    academic_year_id: int,
    title: str,
    instructions: Optional[str],
    assigned_date: date,
    submission_date: date,
    hw_status: str,
    notify_parents: bool,
) -> Homework:
    now = datetime.utcnow()
    published_at = now if hw_status == "Published" else None

    hw = Homework(
        tenant_id=tenant_id,
        teacher_id=teacher_id,
        class_id=class_id,
        class_division_id=class_division_id,
        subject_id=subject_id,
        academic_year_id=academic_year_id,
        title=title,
        instructions=instructions,
        assigned_date=assigned_date,
        submission_date=submission_date,
        status=hw_status,
        notify_parents=notify_parents,
        published_at=published_at,
        published_by=user_id if hw_status == "Published" else None,
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
    hw: Homework,
    user_id: int,
    update_data: dict,
) -> Homework:
    for key, value in update_data.items():
        setattr(hw, key, value)

    hw.updated_at = datetime.utcnow()
    hw.updated_by = user_id

    if update_data.get("status") == "Published" and not hw.published_at:
        hw.published_at = datetime.utcnow()
        hw.published_by = user_id

    db.commit()
    db.refresh(hw)
    return hw


def soft_delete_homework(
    db: Session,
    *,
    hw: Homework,
    user_id: int,
) -> None:
    hw.is_deleted = True
    hw.deleted_at = datetime.utcnow()
    hw.deleted_by = user_id
    db.commit()


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
) -> HomeworkAttachment:
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


def get_attachment(
    db: Session,
    *,
    homework_id: int,
    attachment_id: int,
) -> HomeworkAttachment:
    att = (
        db.query(HomeworkAttachment)
        .filter(
            HomeworkAttachment.id == attachment_id,
            HomeworkAttachment.homework_id == homework_id,
        )
        .first()
    )
    if not att:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attachment not found",
        )
    return att


def delete_attachment(db: Session, *, att: HomeworkAttachment) -> str:
    """Delete attachment record and return its file_path for disk cleanup."""
    file_path = att.file_path
    db.delete(att)
    db.commit()
    return file_path


# ---------------------------------------------------------------------------
# Dropdown helpers
# ---------------------------------------------------------------------------

def get_classes_for_teacher(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
) -> list:
    from app.models.academic import SchoolClass
    from app.schemas.homework_schema import ClassOption

    teacher_id = _resolve_teacher_id(db, tenant_id, user_id)

    if teacher_id is None:
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
    from app.schemas.homework_schema import ClassOption
    return [ClassOption(id=r["id"], name=r["name"]) for r in rows]


def get_divisions_for_teacher_class(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    class_id: int,
) -> list:
    teacher_id = _resolve_teacher_id(db, tenant_id, user_id)

    if teacher_id is None:
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


def get_subjects_for_teacher_class(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    class_id: int,
    academic_year_id: Optional[int] = None,
) -> list:
    from app.schemas.homework_schema import SubjectOption

    teacher_id = _resolve_teacher_id(db, tenant_id, user_id)

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

    if teacher_id is None:
        rows = db.execute(fallback_sql, {"tenant_id": tenant_id, "class_id": class_id}).mappings().all()
        return [SubjectOption(id=r["id"], name=r["name"], code=r["code"]) for r in rows]

    params: dict = {"tenant_id": tenant_id, "teacher_id": teacher_id, "class_id": class_id}
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

    fallback_rows = db.execute(
        fallback_sql, {"tenant_id": tenant_id, "class_id": class_id}
    ).mappings().all()
    return [SubjectOption(id=r["id"], name=r["name"], code=r["code"]) for r in fallback_rows]
