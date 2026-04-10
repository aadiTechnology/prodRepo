from datetime import datetime
import re
from fastapi import HTTPException
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload
from app.models import SchoolClass, ClassDivision, AcademicYear
from app.schemas.school_class_schema import SchoolClassCreate, SchoolClassUpdate


def _normalize_text(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    return normalized or None


def _check_duplicate_code(
    db: Session,
    tenant_id: int,
    academic_year_id: int | None,
    code: str,
    exclude_id: int | None = None,
) -> None:
    query = db.query(SchoolClass).filter(
        SchoolClass.tenant_id == tenant_id,
        SchoolClass.academic_year_id == academic_year_id,
        func.lower(SchoolClass.code) == code.lower(),
        SchoolClass.is_deleted == False,
    )
    if exclude_id is not None:
        query = query.filter(SchoolClass.id != exclude_id)
    existing = query.first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Class code must be unique within tenant",
        )


def _check_academic_year_exists(db: Session, tenant_id: int, academic_year_id: int) -> None:
    academic_year = db.query(AcademicYear).filter(
        AcademicYear.id == academic_year_id,
        AcademicYear.tenant_id == tenant_id,
        AcademicYear.is_deleted == False,
        AcademicYear.is_active == True,
    ).first()
    if not academic_year:
        raise HTTPException(status_code=400, detail="Invalid academic year for this tenant")


def _find_existing_class_for_year(
    db: Session,
    tenant_id: int,
    academic_year_id: int,
    class_name: str,
):
    return db.query(SchoolClass).options(joinedload(SchoolClass.divisions)).filter(
        SchoolClass.tenant_id == tenant_id,
        SchoolClass.academic_year_id == academic_year_id,
        func.lower(SchoolClass.name) == class_name.lower(),
        SchoolClass.is_deleted == False,
    ).first()


def _division_exists(db_obj: SchoolClass, division_name: str) -> bool:
    return any(
        division.division_name.strip().lower() == division_name.lower()
        for division in db_obj.divisions
    )



def _generate_default_code(name: str) -> str:
    raw = name.strip().upper()
    normalized = re.sub(r"[^A-Z0-9]+", "-", raw).strip("-")
    return normalized[:40] or "CLASS"



def get_all_classes(
    db: Session,
    tenant_id: int,
    academic_year_id: int | None = None,
    search: str | None = None,
):
    query = db.query(SchoolClass).filter(
        SchoolClass.tenant_id == tenant_id,
        SchoolClass.is_deleted == False,
    )
    if academic_year_id is not None:
        query = query.filter(SchoolClass.academic_year_id == academic_year_id)

    if search:
        text = f"%{search.strip()}%"
        query = query.filter(
            or_(
                SchoolClass.name.ilike(text),
                SchoolClass.code.ilike(text),
            )
        )

    return query.options(joinedload(SchoolClass.divisions), joinedload(SchoolClass.academic_year)).order_by(SchoolClass.name.asc()).distinct().all()


def get_class_by_id(db: Session, class_id: int, tenant_id: int):
    db_obj = db.query(SchoolClass).options(joinedload(SchoolClass.divisions), joinedload(SchoolClass.academic_year)).filter(
        SchoolClass.id == class_id,
        SchoolClass.tenant_id == tenant_id,
        SchoolClass.is_deleted == False,
    ).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Class not found")
    return db_obj


def create_class(
    db: Session,
    data: SchoolClassCreate,
    tenant_id: int,
    created_by: int,
):
    _check_academic_year_exists(db, tenant_id, data.academic_year_id)
    normalized_name = data.name.strip()
    normalized_section = _normalize_text(data.section)
    existing_class = _find_existing_class_for_year(
        db=db,
        tenant_id=tenant_id,
        academic_year_id=data.academic_year_id,
        class_name=normalized_name,
    )
    if existing_class:
        if normalized_section:
            if _division_exists(existing_class, normalized_section):
                raise HTTPException(status_code=400, detail="Section already exists for this class.")
            db.add(
                ClassDivision(
                    class_id=existing_class.id,
                    division_name=normalized_section,
                    capacity=data.capacity,
                    is_active=data.is_active,
                )
            )
        db.commit()
        return get_class_by_id(db, existing_class.id, tenant_id)

    normalized_code = _normalize_text(data.code)
    final_code = normalized_code or _generate_default_code(normalized_name)
    _check_duplicate_code(db, tenant_id, data.academic_year_id, final_code)

    db_obj = SchoolClass(
        tenant_id=tenant_id,
        academic_year_id=data.academic_year_id,
        name=normalized_name,
        code=final_code,
        description=_normalize_text(data.description),
        capacity=data.capacity,
        is_active=data.is_active,
        created_by=created_by,
        created_at=datetime.utcnow(),
    )
    db.add(db_obj)
    db.flush()  # To get db_obj.id

    # Create default division if section provided
    if normalized_section:
        division = ClassDivision(
            class_id=db_obj.id,
            division_name=normalized_section,
            capacity=data.capacity,
            is_active=data.is_active
        )
        db.add(division)

    db.commit()
    db.refresh(db_obj)
    return db_obj


def update_class(
    db: Session,
    class_id: int,
    data: SchoolClassUpdate,
    tenant_id: int,
    updated_by: int,
):
    db_obj = get_class_by_id(db, class_id, tenant_id)
    update_data = data.model_dump(exclude_unset=True)
    target_academic_year_id = update_data.get("academic_year_id", db_obj.academic_year_id)
    if target_academic_year_id is not None:
        _check_academic_year_exists(db, tenant_id, target_academic_year_id)

    new_code = update_data.get("code", db_obj.code)
    normalized_code = new_code.strip() if isinstance(new_code, str) else new_code

    if normalized_code and normalized_code.lower() != db_obj.code.lower():
        _check_duplicate_code(
            db,
            tenant_id,
            target_academic_year_id,
            normalized_code,
            exclude_id=db_obj.id,
        )

    if "name" in update_data and isinstance(update_data["name"], str):
        update_data["name"] = update_data["name"].strip()
    if "code" in update_data and isinstance(update_data["code"], str):
        normalized_update_code = update_data["code"].strip()
        if normalized_update_code:
            update_data["code"] = normalized_update_code
        else:
            update_data.pop("code")
    if "description" in update_data:
        update_data["description"] = _normalize_text(update_data["description"])

    # Handle automated division update if section provided
    if "section" in update_data:
        normalized_section = _normalize_text(update_data.pop("section"))
        if normalized_section:
            if not _division_exists(db_obj, normalized_section):
                division = ClassDivision(
                    class_id=db_obj.id,
                    division_name=normalized_section,
                    capacity=db_obj.capacity,
                    is_active=db_obj.is_active
                )
                db.add(division)

    for key, value in update_data.items():
        setattr(db_obj, key, value)

    db_obj.updated_by = updated_by
    db_obj.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_obj)
    return db_obj


def soft_delete_class(db: Session, class_id: int, tenant_id: int, deleted_by: int):
    db_obj = get_class_by_id(db, class_id, tenant_id)
    db_obj.is_deleted = True
    db_obj.deleted_at = datetime.utcnow()
    db_obj.deleted_by = deleted_by
    db.commit()
