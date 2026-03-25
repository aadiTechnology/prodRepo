from datetime import datetime
import re
from fastapi import HTTPException
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from app.models import SchoolClass, AcademicYear
from app.schemas.school_class_schema import SchoolClassCreate, SchoolClassUpdate


def _normalize_text(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    return normalized or None


def _check_duplicate_code(
    db: Session,
    tenant_id: int,
    code: str,
    exclude_id: int | None = None,
) -> None:
    query = db.query(SchoolClass).filter(
        SchoolClass.tenant_id == tenant_id,
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


def _build_code_seed(name: str, section: str | None) -> str:
    raw = f"{name} {section or ''}".strip().upper()
    normalized = re.sub(r"[^A-Z0-9]+", "-", raw).strip("-")
    return normalized[:40] or "CLASS"


def _generate_unique_code(
    db: Session,
    tenant_id: int,
    name: str,
    section: str | None,
) -> str:
    seed = _build_code_seed(name, section)
    query = db.query(SchoolClass.code).filter(
        SchoolClass.tenant_id == tenant_id,
        SchoolClass.is_deleted == False,
    )
    existing_codes = {row[0].lower() for row in query.all() if row[0]}

    candidate = seed
    suffix = 2
    while candidate.lower() in existing_codes:
        candidate = f"{seed}-{suffix}"[:50]
        suffix += 1
    return candidate


def _ensure_academic_year_exists(db: Session, tenant_id: int, academic_year_id: int) -> None:
    year = db.query(AcademicYear).filter(
        AcademicYear.id == academic_year_id,
        AcademicYear.tenant_id == tenant_id,
        AcademicYear.is_deleted == False,
    ).first()
    if not year:
        raise HTTPException(status_code=400, detail="Invalid academic year for this tenant")


def get_all_classes(
    db: Session,
    tenant_id: int,
    search: str | None = None,
):
    query = db.query(SchoolClass).filter(
        SchoolClass.tenant_id == tenant_id,
        SchoolClass.is_deleted == False,
    )

    if search:
        text = f"%{search.strip()}%"
        query = query.filter(
            or_(
                SchoolClass.name.ilike(text),
                SchoolClass.code.ilike(text),
                SchoolClass.section.ilike(text),
            )
        )

    return query.order_by(SchoolClass.name.asc(), SchoolClass.section.asc()).all()


def get_class_by_id(db: Session, class_id: int, tenant_id: int):
    db_obj = db.query(SchoolClass).filter(
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
    normalized_name = data.name.strip()
    normalized_section = _normalize_text(data.section)
    normalized_code = _normalize_text(data.code)
    _ensure_academic_year_exists(db, tenant_id, data.academic_year_id)
    final_code = normalized_code or _generate_unique_code(
        db=db,
        tenant_id=tenant_id,
        name=normalized_name,
        section=normalized_section,
    )
    _check_duplicate_code(db, tenant_id, final_code)

    db_obj = SchoolClass(
        tenant_id=tenant_id,
        academic_year_id=data.academic_year_id,
        name=normalized_name,
        code=final_code,
        description=_normalize_text(data.description),
        section=normalized_section,
        capacity=data.capacity,
        is_active=data.is_active,
        created_by=created_by,
        created_at=datetime.utcnow(),
    )
    db.add(db_obj)
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
    if "academic_year_id" in update_data and update_data["academic_year_id"] is not None:
        _ensure_academic_year_exists(db, tenant_id, update_data["academic_year_id"])

    new_code = update_data.get("code", db_obj.code)
    normalized_code = new_code.strip() if isinstance(new_code, str) else new_code

    if normalized_code and normalized_code.lower() != db_obj.code.lower():
        _check_duplicate_code(
            db,
            tenant_id,
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
    if "section" in update_data:
        update_data["section"] = _normalize_text(update_data["section"])

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
