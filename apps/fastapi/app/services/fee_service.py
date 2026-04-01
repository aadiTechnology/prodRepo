from datetime import datetime
from uuid import uuid4
from sqlalchemy.orm import Session
from app.models.fee import FeeCategory, FeeStructure, FeeInstallment
from app.models.academic import SchoolClass, AcademicYear
from app.schemas.fee import FeeStructureCreate, FeeStructureUpdate, FeeCategoryCreate, FeeCategoryUpdate
from app.core.exceptions import NotFoundException, ConflictException
from app.core.logging_config import get_logger

logger = get_logger(__name__)


def get_fee_categories(db: Session, tenant_id: int) -> list[FeeCategory]:
    """Return all non-deleted fee categories for a tenant."""
    return (
        db.query(FeeCategory)
        .filter(FeeCategory.tenant_id == tenant_id, FeeCategory.status == True)
        .all()
    )


def get_fee_category(db: Session, tenant_id: int, category_id: str) -> FeeCategory:
    """Return a single fee category or raise if not found."""
    category_id = str(category_id)
    obj = (
        db.query(FeeCategory)
        .filter(
            FeeCategory.id == category_id,
            FeeCategory.tenant_id == tenant_id,
            FeeCategory.status == True,
        )
        .first()
    )
    if not obj:
        raise NotFoundException("FeeCategory", category_id)
    return obj


def create_fee_category(db: Session, obj_in: FeeCategoryCreate, tenant_id: int, user_id: int | None) -> FeeCategory:
    """Create a new fee category. Code is optional and auto-derived from name when omitted."""
    name = obj_in.name.strip()
    code = (obj_in.code or name[:4]).upper()

    db_obj = FeeCategory(
        id=str(uuid4()),
        tenant_id=tenant_id,
        name=name,
        code=code,
        description=obj_in.description,
        status=obj_in.status if obj_in.status is not None else True,
        created_by=user_id,
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def update_fee_category(
    db: Session,
    category_id: str,
    obj_in: FeeCategoryUpdate,
    tenant_id: int,
    user_id: int | None,
) -> FeeCategory:
    """Update an existing fee category."""
    db_obj = get_fee_category(db, tenant_id, category_id)

    update_data = obj_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)

    db_obj.updated_at = datetime.utcnow()
    db_obj.updated_by = user_id

    db.commit()
    db.refresh(db_obj)
    return db_obj


def delete_fee_category(db: Session, category_id: str, tenant_id: int, user_id: int | None) -> None:
    """Soft delete a fee category."""
    db_obj = get_fee_category(db, tenant_id, category_id)
    db_obj.status = False
    db_obj.updated_at = datetime.utcnow()
    db_obj.updated_by = user_id
    db_obj.deleted_by = user_id
    db.commit()

def get_fee_structures(db: Session, tenant_id: int, class_id: int = None, academic_year_id: int = None, class_name: str = None) -> list[FeeStructure]:
    query = db.query(FeeStructure).filter(
        FeeStructure.tenant_id == tenant_id,
        FeeStructure.is_deleted == False
    )
    if class_id:
        query = query.filter(FeeStructure.class_id == class_id)
    if class_name:
        query = query.join(FeeStructure.class_model).filter(SchoolClass.name == class_name)
    if academic_year_id:
        query = query.filter(FeeStructure.academic_year_id == academic_year_id)
    
    structures = query.all()
    
    if not structures:
        return []

    # Fetch lookup dictionaries to avoid N+1 queries
    class_ids = list({s.class_id for s in structures if s.class_id})
    category_ids = list({str(s.fee_category_id) for s in structures if s.fee_category_id})
    year_ids = list({s.academic_year_id for s in structures if s.academic_year_id})

    class_map = {}
    if class_ids:
        classes = db.query(SchoolClass.id, SchoolClass.name).filter(
            SchoolClass.id.in_(class_ids), SchoolClass.tenant_id == tenant_id
        ).all()
        class_map = {c.id: c.name for c in classes}

    category_map = {}
    if category_ids:
        categories = db.query(FeeCategory.id, FeeCategory.name).filter(
            FeeCategory.id.in_(category_ids), FeeCategory.tenant_id == tenant_id
        ).all()
        category_map = {str(c.id): c.name for c in categories}

    year_map = {}
    if year_ids:
        years = db.query(AcademicYear.id, AcademicYear.name).filter(
            AcademicYear.id.in_(year_ids), AcademicYear.tenant_id == tenant_id
        ).all()
        year_map = {y.id: y.name for y in years}

    # Enrich with names
    for s in structures:
        s.class_name = class_map.get(s.class_id)
        s.fee_category_name = category_map.get(str(s.fee_category_id))
        s.academic_year_name = year_map.get(s.academic_year_id)
        
    # Deduplicate by (class_name, academic_year_id, fee_category_id)
    unique_structures = []
    seen = set()
    for s in structures:
        key = (s.class_name, s.academic_year_id, str(s.fee_category_id))
        if key not in seen:
            seen.add(key)
            unique_structures.append(s)

    return unique_structures

def get_fee_structure(db: Session, structure_id: int, tenant_id: int) -> FeeStructure:
    obj = db.query(FeeStructure).filter(
        FeeStructure.id == structure_id,
        FeeStructure.tenant_id == tenant_id,
        FeeStructure.is_deleted == False
    ).first()
    if not obj:
        raise NotFoundException("FeeStructure", structure_id)

    # Enrich with names
    obj.class_name = db.query(SchoolClass.name).filter(
        SchoolClass.id == obj.class_id, SchoolClass.tenant_id == tenant_id
    ).scalar()
    obj.fee_category_name = db.query(FeeCategory.name).filter(
        FeeCategory.id == str(obj.fee_category_id), FeeCategory.tenant_id == tenant_id
    ).scalar()
    obj.academic_year_name = db.query(AcademicYear.name).filter(
        AcademicYear.id == obj.academic_year_id, AcademicYear.tenant_id == tenant_id
    ).scalar()

    return obj

def create_fee_structure(db: Session, obj_in: FeeStructureCreate, tenant_id: int, user_id: int) -> FeeStructure:
    # 1. Look up the designated class to get its name
    target_class = db.query(SchoolClass).filter(
        SchoolClass.id == obj_in.class_id, 
        SchoolClass.tenant_id == tenant_id
    ).first()
    
    if not target_class:
        raise NotFoundException("SchoolClass", obj_in.class_id)
        
    # Find all classes with same name and academic year
    matching_classes = db.query(SchoolClass).filter(
        SchoolClass.name == target_class.name,
        SchoolClass.academic_year_id == obj_in.academic_year_id,
        SchoolClass.tenant_id == tenant_id,
        SchoolClass.is_deleted == False
    ).all()
    
    if not matching_classes:
        raise NotFoundException("SchoolClass matching name and academic year", target_class.name)
        
    # Check if ANY of these already have a fee structure for this category
    class_ids = [c.id for c in matching_classes]
    existing = db.query(FeeStructure).filter(
        FeeStructure.tenant_id == tenant_id,
        FeeStructure.class_id.in_(class_ids),
        FeeStructure.fee_category_id == obj_in.fee_category_id,
        FeeStructure.academic_year_id == obj_in.academic_year_id,
        FeeStructure.is_deleted == False
    ).first()
    
    if existing:
        raise ConflictException("Fee structure already exists for this class, category, and year.")

    # Create one FeeStructure per section
    created_structures = []
    
    for cls in matching_classes:
        db_obj = FeeStructure(
            tenant_id=tenant_id,
            class_id=cls.id,
            fee_category_id=obj_in.fee_category_id,
            academic_year_id=obj_in.academic_year_id,
            total_amount=obj_in.total_amount,
            installment_type=obj_in.installment_type,
            num_installments=obj_in.num_installments,
            description=obj_in.description,
            name="",  # Providing default to avoid NOT NULL constraint on SQL Server
            is_active=obj_in.is_active,
            created_by=user_id
        )
        db.add(db_obj)
        db.flush() # Get ID
        
        # Handle installments
        for inst_in in obj_in.installments:
            inst_data = inst_in.model_dump()
            if not inst_data.get("fee_category_id"):
                inst_data["fee_category_id"] = db_obj.fee_category_id
            inst_db = FeeInstallment(
                fee_structure_id=db_obj.id,
                **inst_data,
                created_by=user_id
            )
            db.add(inst_db)
            
        created_structures.append(db_obj)
        
    db.commit()
    for s in created_structures:
        db.refresh(s)
        
    # Return the one that matches the requested class_id exactly
    for s in created_structures:
        if s.class_id == obj_in.class_id:
            return s
            
    return created_structures[0] if created_structures else None

def update_fee_structure(db: Session, structure_id: int, obj_in: FeeStructureUpdate, tenant_id: int, user_id: int) -> FeeStructure:
    db_obj = get_fee_structure(db, structure_id, tenant_id)
    
    # We update ALL structures that share the same class_name, category, and academic_year
    target_class = db.query(SchoolClass).filter(
        SchoolClass.id == db_obj.class_id, SchoolClass.tenant_id == tenant_id
    ).first()
    
    matching_classes = db.query(SchoolClass).filter(
        SchoolClass.name == target_class.name,
        SchoolClass.academic_year_id == db_obj.academic_year_id,
        SchoolClass.tenant_id == tenant_id,
        SchoolClass.is_deleted == False
    ).all()
    
    class_ids = [c.id for c in matching_classes]
    
    structures_to_update = db.query(FeeStructure).filter(
        FeeStructure.tenant_id == tenant_id,
        FeeStructure.class_id.in_(class_ids),
        FeeStructure.fee_category_id == db_obj.fee_category_id,
        FeeStructure.academic_year_id == db_obj.academic_year_id,
        FeeStructure.is_deleted == False
    ).all()
    
    update_data = obj_in.model_dump(exclude={"installments"}, exclude_unset=True)
    
    for struct in structures_to_update:
        for field, value in update_data.items():
            setattr(struct, field, value)
        
        struct.updated_at = datetime.utcnow()
        struct.updated_by = user_id
        
        if obj_in.installments is not None:
            # Delete existing and add new
            db.query(FeeInstallment).filter(FeeInstallment.fee_structure_id == struct.id).delete()
            for inst_in in obj_in.installments:
                inst_data = inst_in.model_dump()
                if not inst_data.get("fee_category_id"):
                    inst_data["fee_category_id"] = struct.fee_category_id
                inst_db = FeeInstallment(
                    fee_structure_id=struct.id,
                    **inst_data,
                    created_by=user_id
                )
                db.add(inst_db)
                
    db.commit()
    for struct in structures_to_update:
        db.refresh(struct)
        
    db.refresh(db_obj)
    return db_obj

def delete_fee_structure(db: Session, structure_id: int, tenant_id: int, user_id: int) -> None:
    db_obj = get_fee_structure(db, structure_id, tenant_id)
    
    # We delete ALL structures that share the same class_name, category, and academic_year
    target_class = db.query(SchoolClass).filter(
        SchoolClass.id == db_obj.class_id, SchoolClass.tenant_id == tenant_id
    ).first()
    
    matching_classes = db.query(SchoolClass).filter(
        SchoolClass.name == target_class.name,
        SchoolClass.academic_year_id == db_obj.academic_year_id,
        SchoolClass.tenant_id == tenant_id,
        SchoolClass.is_deleted == False
    ).all()
    
    class_ids = [c.id for c in matching_classes]
    
    structures_to_delete = db.query(FeeStructure).filter(
        FeeStructure.tenant_id == tenant_id,
        FeeStructure.class_id.in_(class_ids),
        FeeStructure.fee_category_id == db_obj.fee_category_id,
        FeeStructure.academic_year_id == db_obj.academic_year_id,
        FeeStructure.is_deleted == False
    ).all()
    
    for struct in structures_to_delete:
        struct.is_deleted = True
        struct.deleted_at = datetime.utcnow()
        struct.deleted_by = user_id
        
        # Soft delete installments too
        db.query(FeeInstallment).filter(FeeInstallment.fee_structure_id == struct.id).update({
            "is_deleted": True,
            "deleted_at": datetime.utcnow(),
            "deleted_by": user_id
        })
    
    db.commit()
