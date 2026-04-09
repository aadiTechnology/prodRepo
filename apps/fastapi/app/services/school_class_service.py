from datetime import datetime
import re
from fastapi import HTTPException
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload
from app.models import SchoolClass, ClassDivision
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



def _generate_default_code(name: str, section: str | None = None) -> str:
    raw = name.strip().upper()
    if section:
        raw += f"-{section.strip().upper()}"
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

    if search:
        text = f"%{search.strip()}%"
        query = query.filter(
            or_(
                SchoolClass.name.ilike(text),
                SchoolClass.code.ilike(text),
            )
        )

    return query.options(joinedload(SchoolClass.divisions)).order_by(SchoolClass.name.asc()).distinct().all()


def get_class_by_id(db: Session, class_id: int, tenant_id: int):
    db_obj = db.query(SchoolClass).options(joinedload(SchoolClass.divisions)).filter(
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
    normalized_code = _normalize_text(data.code)
    final_code = normalized_code or _generate_default_code(normalized_name, data.section)
    _check_duplicate_code(db, tenant_id, final_code)

    db_obj = SchoolClass(
        tenant_id=tenant_id,
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
    normalized_section = _normalize_text(data.section)
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

    # Handle automated division update if section provided
    if "section" in update_data:
        normalized_section = _normalize_text(update_data.pop("section"))
        if normalized_section:
            # Update first division or create if none exists
            if db_obj.divisions:
                db_obj.divisions[0].division_name = normalized_section
            else:
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
