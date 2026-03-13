from datetime import datetime
from sqlalchemy.orm import Session
from app.models.fee import FeeCategory, FeeStructure, FeeInstallment
from app.models.academic import ClassModel, AcademicYear
from app.schemas.fee import FeeStructureCreate, FeeStructureUpdate
from app.core.exceptions import NotFoundException, ConflictException
from app.core.logging_config import get_logger

logger = get_logger(__name__)

def get_fee_categories(db: Session, tenant_id: int) -> list[FeeCategory]:
    return db.query(FeeCategory).filter(FeeCategory.tenant_id == tenant_id).all()

def get_fee_structures(db: Session, tenant_id: int, class_id: int = None, academic_year_id: int = None) -> list[FeeStructure]:
    query = db.query(FeeStructure).filter(
        FeeStructure.tenant_id == tenant_id,
        FeeStructure.is_deleted == False
    )
    if class_id:
        query = query.filter(FeeStructure.class_id == class_id)
    if academic_year_id:
        query = query.filter(FeeStructure.academic_year_id == academic_year_id)
    
    structures = query.all()
    
    # Enrich with names (or use joinedload in production)
    for s in structures:
        s.class_name = db.query(ClassModel.name).filter(ClassModel.id == s.class_id).scalar()
        s.fee_category_name = db.query(FeeCategory.name).filter(FeeCategory.id == s.fee_category_id).scalar()
        s.academic_year_name = db.query(AcademicYear.name).filter(AcademicYear.id == s.academic_year_id).scalar()
        
    return structures

def get_fee_structure(db: Session, structure_id: int, tenant_id: int) -> FeeStructure:
    obj = db.query(FeeStructure).filter(
        FeeStructure.id == structure_id,
        FeeStructure.tenant_id == tenant_id,
        FeeStructure.is_deleted == False
    ).first()
    if not obj:
        raise NotFoundException("FeeStructure", structure_id)
    return obj

def create_fee_structure(db: Session, obj_in: FeeStructureCreate, tenant_id: int, user_id: int) -> FeeStructure:
    # Check if a structure for same class, category, and year already exists
    existing = db.query(FeeStructure).filter(
        FeeStructure.tenant_id == tenant_id,
        FeeStructure.class_id == obj_in.class_id,
        FeeStructure.fee_category_id == obj_in.fee_category_id,
        FeeStructure.academic_year_id == obj_in.academic_year_id,
        FeeStructure.is_deleted == False
    ).first()
    
    if existing:
        raise ConflictException("Fee structure already exists for this class, category, and year.")

    db_obj = FeeStructure(
        tenant_id=tenant_id,
        class_id=obj_in.class_id,
        fee_category_id=obj_in.fee_category_id,
        academic_year_id=obj_in.academic_year_id,
        total_amount=obj_in.total_amount,
        installment_type=obj_in.installment_type,
        num_installments=obj_in.num_installments,
        description=obj_in.description,
        is_active=obj_in.is_active,
        created_by=user_id
    )
    db.add(db_obj)
    db.flush() # Get ID

    # Handle installments
    for inst_in in obj_in.installments:
        inst_db = FeeInstallment(
            fee_structure_id=db_obj.id,
            **inst_in.model_dump(),
            created_by=user_id
        )
        db.add(inst_db)
    
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_fee_structure(db: Session, structure_id: int, obj_in: FeeStructureUpdate, tenant_id: int, user_id: int) -> FeeStructure:
    db_obj = get_fee_structure(db, structure_id, tenant_id)
    
    update_data = obj_in.model_dump(exclude={"installments"}, exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    
    db_obj.updated_at = datetime.utcnow()
    db_obj.updated_by = user_id
    
    if obj_in.installments is not None:
        # Simple implementation: Delete existing and add new
        db.query(FeeInstallment).filter(FeeInstallment.fee_structure_id == structure_id).delete()
        for inst_in in obj_in.installments:
            inst_db = FeeInstallment(
                fee_structure_id=db_obj.id,
                **inst_in.model_dump(),
                created_by=user_id
            )
            db.add(inst_db)
            
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_fee_structure(db: Session, structure_id: int, tenant_id: int, user_id: int) -> None:
    db_obj = get_fee_structure(db, structure_id, tenant_id)
    db_obj.is_deleted = True
    db_obj.deleted_at = datetime.utcnow()
    db_obj.deleted_by = user_id
    
    # Soft delete installments too
    db.query(FeeInstallment).filter(FeeInstallment.fee_structure_id == structure_id).update({
        "is_deleted": True,
        "deleted_at": datetime.utcnow(),
        "deleted_by": user_id
    })
    
    db.commit()
