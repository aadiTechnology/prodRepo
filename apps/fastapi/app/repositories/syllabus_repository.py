from __future__ import annotations

from datetime import datetime

from sqlalchemy import case, or_
from sqlalchemy.orm import Session

from app.models.academic import AcademicYear, SchoolClass
from app.models.syllabus import Syllabus, SyllabusAttachment
from app.models.user import User

_MONTH_RANK = case(
    (Syllabus.month == "January", 1),
    (Syllabus.month == "February", 2),
    (Syllabus.month == "March", 3),
    (Syllabus.month == "April", 4),
    (Syllabus.month == "May", 5),
    (Syllabus.month == "June", 6),
    (Syllabus.month == "July", 7),
    (Syllabus.month == "August", 8),
    (Syllabus.month == "September", 9),
    (Syllabus.month == "October", 10),
    (Syllabus.month == "November", 11),
    (Syllabus.month == "December", 12),
    else_=0,
)


def get_user_display_name(db: Session, user_id: int | None) -> str | None:
    if user_id is None:
        return None
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None
    return user.full_name or str(user.email)


def list_syllabus(
    db: Session,
    *,
    tenant_id: int,
    page: int,
    size: int,
    search: str | None,
    academic_year_id: int | None,
    class_id: int | None,
    month: str | None,
    scoped_class_ids: list[int] | None,
) -> tuple[list[Syllabus], int]:
    query = db.query(Syllabus).filter(
        Syllabus.tenant_id == tenant_id,
        Syllabus.is_deleted == False,  # noqa: E712
    )

    if academic_year_id is not None:
        query = query.filter(Syllabus.academic_year_id == academic_year_id)
    if class_id is not None:
        query = query.filter(Syllabus.class_id == class_id)
    if month:
        query = query.filter(Syllabus.month == month)
    if scoped_class_ids is not None:
        if not scoped_class_ids:
            return [], 0
        query = query.filter(Syllabus.class_id.in_(scoped_class_ids))

    if search and search.strip():
        term = f"%{search.strip()}%"
        attachment_match = (
            db.query(SyllabusAttachment.id)
            .filter(
                SyllabusAttachment.syllabus_id == Syllabus.id,
                SyllabusAttachment.is_deleted == False,  # noqa: E712
                SyllabusAttachment.file_name.ilike(term),
            )
            .exists()
        )
        query = query.outerjoin(SchoolClass, SchoolClass.id == Syllabus.class_id).filter(
            or_(
                Syllabus.month.ilike(term),
                SchoolClass.name.ilike(term),
                attachment_match,
            )
        )

    total = query.count()
    rows = (
        query.order_by(_MONTH_RANK.desc(), Syllabus.upload_date.desc(), Syllabus.id.desc())
        .offset(page * size)
        .limit(size)
        .all()
    )
    return rows, total


def get_syllabus_by_id(
    db: Session,
    *,
    tenant_id: int,
    syllabus_id: int,
) -> Syllabus | None:
    return (
        db.query(Syllabus)
        .filter(
            Syllabus.id == syllabus_id,
            Syllabus.tenant_id == tenant_id,
            Syllabus.is_deleted == False,  # noqa: E712
        )
        .first()
    )


def create_syllabus(
    db: Session,
    *,
    tenant_id: int,
    academic_year_id: int,
    class_id: int,
    month: str,
    user_id: int,
) -> Syllabus:
    now = datetime.utcnow()
    row = Syllabus(
        tenant_id=tenant_id,
        academic_year_id=academic_year_id,
        class_id=class_id,
        month=month,
        uploaded_by=user_id,
        upload_date=now,
        created_by=user_id,
        created_at=now,
    )
    db.add(row)
    db.flush()
    return row


def update_syllabus_row(
    db: Session,
    row: Syllabus,
    *,
    user_id: int,
    academic_year_id: int,
    class_id: int,
    month: str,
) -> Syllabus:
    now = datetime.utcnow()
    row.academic_year_id = academic_year_id
    row.class_id = class_id
    row.month = month
    row.uploaded_by = user_id
    row.upload_date = now
    row.updated_by = user_id
    row.updated_at = now
    db.flush()
    return row


def soft_delete_syllabus(db: Session, row: Syllabus, *, user_id: int) -> None:
    now = datetime.utcnow()
    row.is_deleted = True
    row.deleted_at = now
    row.deleted_by = user_id
    row.updated_at = now
    row.updated_by = user_id
    db.flush()


def get_active_attachment(
    db: Session,
    *,
    syllabus_id: int,
) -> SyllabusAttachment | None:
    return (
        db.query(SyllabusAttachment)
        .filter(
            SyllabusAttachment.syllabus_id == syllabus_id,
            SyllabusAttachment.is_deleted == False,  # noqa: E712
        )
        .order_by(SyllabusAttachment.id.desc())
        .first()
    )


def get_attachment(
    db: Session,
    *,
    tenant_id: int,
    syllabus_id: int,
    attachment_id: int,
) -> SyllabusAttachment | None:
    return (
        db.query(SyllabusAttachment)
        .filter(
            SyllabusAttachment.id == attachment_id,
            SyllabusAttachment.syllabus_id == syllabus_id,
            SyllabusAttachment.tenant_id == tenant_id,
            SyllabusAttachment.is_deleted == False,  # noqa: E712
        )
        .first()
    )


def add_attachment(
    db: Session,
    *,
    tenant_id: int,
    syllabus_id: int,
    file_name: str,
    file_path: str,
    file_type: str | None,
    file_size_kb: int | None,
    user_id: int,
) -> SyllabusAttachment:
    row = SyllabusAttachment(
        tenant_id=tenant_id,
        syllabus_id=syllabus_id,
        file_name=file_name,
        file_path=file_path,
        file_type=file_type,
        file_size_kb=file_size_kb,
        uploaded_by=user_id,
    )
    db.add(row)
    db.flush()
    return row


def soft_delete_attachment(
    db: Session,
    row: SyllabusAttachment,
    *,
    user_id: int,
) -> None:
    row.is_deleted = True
    row.deleted_at = datetime.utcnow()
    row.deleted_by = user_id
    db.flush()


def list_academic_years(db: Session, *, tenant_id: int) -> list[AcademicYear]:
    return (
        db.query(AcademicYear)
        .filter(
            AcademicYear.tenant_id == tenant_id,
            AcademicYear.is_deleted == False,  # noqa: E712
            AcademicYear.is_active == True,  # noqa: E712
        )
        .order_by(AcademicYear.start_date.desc(), AcademicYear.id.desc())
        .all()
    )


def get_academic_year(
    db: Session,
    *,
    tenant_id: int,
    academic_year_id: int,
) -> AcademicYear | None:
    return (
        db.query(AcademicYear)
        .filter(
            AcademicYear.id == academic_year_id,
            AcademicYear.tenant_id == tenant_id,
            AcademicYear.is_deleted == False,  # noqa: E712
        )
        .first()
    )


def list_active_classes(db: Session, *, tenant_id: int) -> list[SchoolClass]:
    return (
        db.query(SchoolClass)
        .filter(
            SchoolClass.tenant_id == tenant_id,
            SchoolClass.is_deleted == False,  # noqa: E712
            SchoolClass.is_active == True,  # noqa: E712
        )
        .order_by(SchoolClass.name)
        .all()
    )
