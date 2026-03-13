from datetime import datetime
from sqlalchemy.orm import Session
from app.models.academic import AcademicYear, ClassModel
from app.schemas.academic import AcademicYearCreate, ClassCreate, AcademicYearUpdate, ClassUpdate
from app.core.exceptions import NotFoundException
from app.core.logging_config import get_logger

logger = get_logger(__name__)

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

def get_classes(db: Session, tenant_id: int, academic_year_id: int = None) -> list[ClassModel]:
    query = db.query(ClassModel).filter(
        ClassModel.tenant_id == tenant_id,
        ClassModel.is_deleted == False
    )
    if academic_year_id:
        query = query.filter(ClassModel.academic_year_id == academic_year_id)
    return query.all()

def get_class(db: Session, class_id: int, tenant_id: int) -> ClassModel:
    obj = db.query(ClassModel).filter(
        ClassModel.id == class_id,
        ClassModel.tenant_id == tenant_id,
        ClassModel.is_deleted == False
    ).first()
    if not obj:
        raise NotFoundException("Class", class_id)
    return obj

def create_class(db: Session, obj_in: ClassCreate, tenant_id: int, user_id: int) -> ClassModel:
    db_obj = ClassModel(
        **obj_in.model_dump(),
        tenant_id=tenant_id,
        created_by=user_id
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj
