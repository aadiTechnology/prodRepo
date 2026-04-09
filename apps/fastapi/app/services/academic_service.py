"""
Academic Service - Business Logic for Academic System
Provides service functions for AcademicYear and Class management
Handles database queries, data validation, and error handling
"""

from datetime import datetime
from sqlalchemy.orm import Session, joinedload
from app.models.academic import AcademicYear, SchoolClass, ClassDivision
from app.schemas.academic import AcademicYearCreate, ClassCreate, AcademicYearUpdate, ClassUpdate
from app.schemas.school_class_schema import SchoolClassCreate
from app.services import school_class_service
from app.core.exceptions import NotFoundException
from app.core.logging_config import get_logger

logger = get_logger(__name__)

# ═══════════════════════════════════════════════════════════════════════════
# Academic Year Operations
# ═══════════════════════════════════════════════════════════════════════════
def get_academic_years(db: Session, tenant_id: int) -> list[AcademicYear]:
    return db.query(AcademicYear).filter(
        AcademicYear.tenant_id == tenant_id,
        AcademicYear.is_deleted == False
    ).all()

def get_academic_year(db: Session, year_id: int, tenant_id: int) -> AcademicYear:
    year = db.query(AcademicYear).filter(
        AcademicYear.id == year_id,
        AcademicYear.tenant_id == tenant_id,
        AcademicYear.is_deleted == False
    ).first()
    if not year:
        raise NotFoundException("AcademicYear", year_id)
    return year

def create_academic_year(db: Session, obj_in: AcademicYearCreate, tenant_id: int, user_id: int) -> AcademicYear:
    db_obj = AcademicYear(
        **obj_in.model_dump(),
        tenant_id=tenant_id,
        created_by=user_id
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def get_classes(db: Session, tenant_id: int, academic_year_id: int = None) -> list[SchoolClass]:
    query = db.query(SchoolClass).filter(
        SchoolClass.tenant_id == tenant_id,
        SchoolClass.is_deleted == False
    )
    if academic_year_id:
        query = query.filter(SchoolClass.academic_year_id == academic_year_id)
    return query.options(joinedload(SchoolClass.divisions)).all()

def get_class(db: Session, class_id: int, tenant_id: int) -> SchoolClass:
    obj = db.query(SchoolClass).filter(
        SchoolClass.id == class_id,
        SchoolClass.tenant_id == tenant_id,
        SchoolClass.is_deleted == False
    ).first()
    if not obj:
        raise NotFoundException("Class", class_id)
    return obj

def create_class(db: Session, obj_in: ClassCreate, tenant_id: int, user_id: int) -> SchoolClass:
    # Convert ClassCreate (from academic schema) to SchoolClassCreate (from school_class schema)
    # to utilize the unified creation logic in school_class_service
    creation_data = SchoolClassCreate(**obj_in.model_dump())
    
    return school_class_service.create_class(
        db=db,
        data=creation_data,
        tenant_id=tenant_id,
        created_by=user_id
    )
