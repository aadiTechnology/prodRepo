from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.teacher import Teacher
from app.schemas.teacher_schema import TeacherCreate, TeacherUpdate
from app.core.exceptions import ConflictException, NotFoundException
from fastapi import HTTPException, status

def get_all_teachers(
    db: Session, 
    tenant_id: int, 
    search: Optional[str] = None, 
    status: Optional[str] = None,
    class_id: Optional[int] = None,
    skip: int = 0, 
    limit: int = 100
) -> Tuple[List[Teacher], int]:
    query = db.query(Teacher).filter(
        Teacher.tenant_id == tenant_id,
        Teacher.is_deleted == False
    )
    
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Teacher.full_name.ilike(search_filter)) | 
            (Teacher.mobile_number.ilike(search_filter)) |
            (Teacher.teacher_code.ilike(search_filter))
        )
        
    if status is not None:
        if status.lower() == "active":
            query = query.filter(Teacher.is_active == True)
        elif status.lower() == "inactive":
            query = query.filter(Teacher.is_active == False)
            
    if class_id is not None:
        query = query.filter(Teacher.class_id == class_id)
            
    total = query.count()
    teachers = query.order_by(Teacher.full_name.asc()).offset(skip).limit(limit).all()
    
    return teachers, total

def get_teacher_by_id(db: Session, teacher_id: int, tenant_id: int) -> Teacher:
    teacher = db.query(Teacher).filter(
        Teacher.id == teacher_id,
        Teacher.tenant_id == tenant_id,
        Teacher.is_deleted == False
    ).first()
    
    if not teacher:
        raise NotFoundException(f"Teacher with ID {teacher_id} not found")
        
    return teacher

def check_mobile_duplicate(db: Session, mobile: str, tenant_id: int, exclude_id: int = None):
    query = db.query(Teacher).filter(
        Teacher.tenant_id == tenant_id, 
        Teacher.mobile_number == mobile,
        Teacher.is_deleted == False
    )
    if exclude_id:
        query = query.filter(Teacher.id != exclude_id)
        
    if query.first():
        raise ConflictException("A teacher with this mobile number already exists.")

def generate_teacher_code(db: Session, tenant_id: int) -> str:
    from sqlalchemy import func
    max_id = db.query(func.max(Teacher.id)).filter(Teacher.tenant_id == tenant_id).scalar() or 0
    return f"T{max_id + 1:03d}"

def check_division_assignment_conflict(db: Session, tenant_id: int, class_id: Optional[int], class_division_id: Optional[int], exclude_id: Optional[int] = None):
    if not class_id or not class_division_id:
        return
        
    query = db.query(Teacher).filter(
        Teacher.tenant_id == tenant_id,
        Teacher.class_id == class_id,
        Teacher.class_division_id == class_division_id,
        Teacher.is_deleted == False
    )
    
    if exclude_id:
        query = query.filter(Teacher.id != exclude_id)
        
    existing_teacher = query.first()
    if existing_teacher:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=[{
                "loc": ["body", "class_division_id"],
                "msg": f"This division is already assigned to teacher: {existing_teacher.full_name}",
                "type": "value_error"
            }]
        )

def create_teacher(db: Session, payload: TeacherCreate, created_by: int, tenant_id: int) -> Teacher:
    check_mobile_duplicate(db, payload.mobile_number, tenant_id)
    check_division_assignment_conflict(db, tenant_id, payload.class_id, payload.class_division_id)
    
    teacher_code = generate_teacher_code(db, tenant_id)
    
    db_teacher = Teacher(
        **payload.model_dump(),
        tenant_id=tenant_id,
        teacher_code=teacher_code,
        created_by=created_by
    )
    
    db.add(db_teacher)
    db.commit()
    db.refresh(db_teacher)
    return db_teacher

def update_teacher(db: Session, teacher_id: int, payload: TeacherUpdate, updated_by: int, tenant_id: int) -> Teacher:
    db_teacher = get_teacher_by_id(db, teacher_id, tenant_id)
    
    if payload.mobile_number and payload.mobile_number != db_teacher.mobile_number:
        check_mobile_duplicate(db, payload.mobile_number, tenant_id, exclude_id=teacher_id)
        
    # Check division conflict if payload has class info
    if (payload.class_id is not None or payload.class_division_id is not None):
        new_class_id = payload.class_id if payload.class_id is not None else db_teacher.class_id
        new_div_id = payload.class_division_id if payload.class_division_id is not None else db_teacher.class_division_id
        
        if new_class_id != db_teacher.class_id or new_div_id != db_teacher.class_division_id:
            check_division_assignment_conflict(db, tenant_id, new_class_id, new_div_id, exclude_id=teacher_id)
        
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_teacher, key, value)
        
    db_teacher.updated_by = updated_by
    db.commit()
    db.refresh(db_teacher)
    return db_teacher

def toggle_teacher_status(db: Session, teacher_id: int, updated_by: int, tenant_id: int) -> Teacher:
    db_teacher = get_teacher_by_id(db, teacher_id, tenant_id)
    db_teacher.is_active = not db_teacher.is_active
    db_teacher.updated_by = updated_by
    db.commit()
    db.refresh(db_teacher)
    return db_teacher

def soft_delete_teacher(db: Session, teacher_id: int, deleted_by: int, tenant_id: int) -> None:
    from datetime import datetime
    db_teacher = get_teacher_by_id(db, teacher_id, tenant_id)
    db_teacher.is_deleted = True
    db_teacher.deleted_at = datetime.utcnow()
    db_teacher.deleted_by = deleted_by
    db.commit()
