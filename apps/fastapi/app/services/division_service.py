from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload
from app.models import ClassDivision, SchoolClass
from app.schemas.division_schema import DivisionCreate, DivisionUpdate

def _check_class_exists(db: Session, class_id: int, tenant_id: int):
    school_class = db.query(SchoolClass).filter(
        SchoolClass.id == class_id,
        SchoolClass.tenant_id == tenant_id,
        SchoolClass.is_deleted == False
    ).first()
    if not school_class:
        raise HTTPException(status_code=404, detail="Class not found or does not belong to your tenant")

def _check_duplicate_division(db: Session, class_id: int, division_name: str, exclude_id: int | None = None):
    query = db.query(ClassDivision).filter(
        ClassDivision.class_id == class_id,
        ClassDivision.division_name == division_name
    )
    if exclude_id is not None:
        query = query.filter(ClassDivision.id != exclude_id)
    
    if query.first():
        raise HTTPException(
            status_code=400,
            detail="Section already exists for this class."
        )

def get_divisions_for_tenant(db: Session, tenant_id: int, class_id: int | None = None):
    query = db.query(ClassDivision).join(SchoolClass).filter(
        SchoolClass.tenant_id == tenant_id,
        SchoolClass.is_deleted == False
    )
    if class_id:
        query = query.filter(ClassDivision.class_id == class_id)
    return query.order_by(SchoolClass.name, ClassDivision.division_name).all()

def get_division_by_id(db: Session, division_id: int, tenant_id: int):
    division = db.query(ClassDivision).join(SchoolClass).filter(
        ClassDivision.id == division_id,
        SchoolClass.tenant_id == tenant_id,
        SchoolClass.is_deleted == False
    ).first()
    
    if not division:
        raise HTTPException(status_code=404, detail="Division not found")
    return division

def create_division(db: Session, data: DivisionCreate, tenant_id: int):
    # Verify class belongs to tenant
    _check_class_exists(db, data.class_id, tenant_id)
    
    # Check duplicate
    normalized_name = data.division_name.strip().upper()
    _check_duplicate_division(db, data.class_id, normalized_name)
    
    db_obj = ClassDivision(
        class_id=data.class_id,
        division_name=normalized_name,
        capacity=data.capacity,
        is_active=data.is_active
    )
    
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_division(db: Session, division_id: int, data: DivisionUpdate, tenant_id: int):
    db_obj = get_division_by_id(db, division_id, tenant_id)
    
    update_data = data.model_dump(exclude_unset=True)
    
    if "division_name" in update_data:
        normalized_name = update_data["division_name"].strip().upper()
        if normalized_name != db_obj.division_name:
            _check_duplicate_division(db, db_obj.class_id, normalized_name, exclude_id=division_id)
        update_data["division_name"] = normalized_name
        
    for key, value in update_data.items():
        setattr(db_obj, key, value)
        
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_division(db: Session, division_id: int, tenant_id: int):
    db_obj = get_division_by_id(db, division_id, tenant_id)
    db.delete(db_obj)
    db.commit()
