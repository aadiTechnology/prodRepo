"""Guards for delete operations when teacher assignments exist."""

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.subject import SubjectClass
from app.models.teacher import Teacher


def class_has_teacher_assignment(db: Session, tenant_id: int, class_id: int) -> bool:
    try:
        assigned = db.execute(
            text(
                """
                SELECT TOP 1 1
                FROM teacher_assignments
                WHERE tenant_id = :tenant_id
                  AND class_id = :class_id
                  AND is_active = 1
                """
            ),
            {"tenant_id": tenant_id, "class_id": class_id},
        ).scalar()
        if assigned:
            return True
    except SQLAlchemyError:
        pass

    legacy = (
        db.query(Teacher)
        .filter(
            Teacher.tenant_id == tenant_id,
            Teacher.class_id == class_id,
            Teacher.is_deleted == False,
            Teacher.is_active == True,
        )
        .first()
    )
    return legacy is not None


def subject_has_teacher_and_class_assignment(
    db: Session, tenant_id: int, subject_id: int
) -> bool:
    has_class_mapping = (
        db.query(SubjectClass)
        .filter(
            SubjectClass.tenant_id == tenant_id,
            SubjectClass.subject_id == subject_id,
        )
        .first()
        is not None
    )
    if not has_class_mapping:
        return False

    try:
        assigned = db.execute(
            text(
                """
                SELECT TOP 1 1
                FROM teacher_assignments
                WHERE tenant_id = :tenant_id
                  AND subject_id = :subject_id
                  AND is_active = 1
                """
            ),
            {"tenant_id": tenant_id, "subject_id": subject_id},
        ).scalar()
        return bool(assigned)
    except SQLAlchemyError:
        return False
