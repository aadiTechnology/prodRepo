from datetime import date, datetime
from math import floor
from uuid import uuid4
from sqlalchemy import String, and_, case, cast, func, or_
from sqlalchemy.orm import Session
from app.models.fee import FeeCategory, FeeStructure, FeeInstallment
from app.models.academic import SchoolClass, AcademicYear
from app.models.fee_payment import FeePayment
from app.models.student import Student
from app.models.student_fee_assignment import StudentFeeAssignment, StudentFeeInstallment
from app.services.school_class_service import require_active_class, require_active_division
from app.models.student_invoice import StudentInvoice
from app.schemas.fee import FeeStructureCreate, FeeStructureUpdate, FeeCategoryCreate, FeeCategoryUpdate
from app.core.exceptions import AppException, NotFoundException, ConflictException
from app.core.logging_config import get_logger

logger = get_logger(__name__)


def _structure_category_ids(structure: FeeStructure) -> list[str]:
    if structure.multi_category_ids:
        ids = [cid.strip() for cid in str(structure.multi_category_ids).split(",") if cid.strip()]
        if ids:
            return ids
    if structure.fee_category_id:
        return [str(structure.fee_category_id)]
    return []


def _sum_category_amounts(db: Session, tenant_id: int, category_ids: list[str]) -> float:
    if not category_ids:
        return 0.0
    rows = (
        db.query(FeeCategory.amount)
        .filter(FeeCategory.tenant_id == tenant_id, FeeCategory.id.in_(category_ids))
        .all()
    )
    return float(sum(float(row.amount or 0) for row in rows))


def _split_installment_amounts(total: float, count: int) -> list[float]:
    if count <= 0 or total <= 0:
        return []
    per = floor((total / count) * 100) / 100
    remainder = round((total - per * count) * 100) / 100
    amounts = [per] * count
    amounts[-1] = round((per + remainder) * 100) / 100
    return amounts


def apply_category_total_to_structure(db: Session, tenant_id: int, structure: FeeStructure) -> tuple[float, list]:
    ids = _structure_category_ids(structure)
    total = _sum_category_amounts(db, tenant_id, ids) if ids else float(structure.total_amount or 0)
    if ids:
        structure.total_amount = total
    installments = (
        db.query(FeeInstallment)
        .filter(
            FeeInstallment.fee_structure_id == structure.id,
            FeeInstallment.is_deleted == False,  # noqa: E712
        )
        .order_by(FeeInstallment.installment_number, FeeInstallment.id)
        .all()
    )
    amounts = _split_installment_amounts(float(total or 0), len(installments))
    for inst, amount in zip(installments, amounts):
        inst.amount = amount
    return float(total or 0), installments


def _sync_fee_structure_totals_for_category(db: Session, tenant_id: int, category_id: str) -> None:
    category_id = str(category_id)
    structures = (
        db.query(FeeStructure)
        .filter(
            FeeStructure.tenant_id == tenant_id,
            FeeStructure.is_deleted == False,  # noqa: E712
            or_(
                FeeStructure.fee_category_id == category_id,
                FeeStructure.multi_category_ids.like(f"%{category_id}%"),
            ),
        )
        .all()
    )
    for structure in structures:
        ids = _structure_category_ids(structure)
        if category_id not in ids:
            continue
        apply_category_total_to_structure(db, tenant_id, structure)
        structure.updated_at = datetime.utcnow()


def get_fee_categories(db: Session, tenant_id: int, class_id: int = None, academic_year_id: int = None, class_name: str = None) -> list[FeeCategory]:
    """Return all non-deleted fee categories for a tenant with academic year and class names."""
    query = db.query(FeeCategory).filter(FeeCategory.tenant_id == tenant_id, FeeCategory.status == True)
    if class_id:
        query = query.filter(FeeCategory.class_id == class_id)
    if academic_year_id:
        query = query.filter(FeeCategory.academic_year_id == academic_year_id)
    if class_name:
        query = query.join(FeeCategory.class_model).filter(SchoolClass.name == class_name)
    
    categories = query.all()
    
    if categories:
        year_ids = list({cat.academic_year_id for cat in categories if cat.academic_year_id})
        class_ids = list({cat.class_id for cat in categories if cat.class_id})
        
        year_map = {}
        if year_ids:
            years = db.query(AcademicYear.id, AcademicYear.name).filter(
                AcademicYear.id.in_(year_ids), AcademicYear.tenant_id == tenant_id
            ).all()
            year_map = {y.id: y.name for y in years}
            
        class_map = {}
        if class_ids:
            classes = db.query(SchoolClass.id, SchoolClass.name).filter(
                SchoolClass.id.in_(class_ids), SchoolClass.tenant_id == tenant_id
            ).all()
            class_map = {c.id: c.name for c in classes}
            
        for cat in categories:
            cat.academic_year_name = year_map.get(cat.academic_year_id)
            cat.class_name = class_map.get(cat.class_id)
            
    return categories


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
        
    # Populate names
    if obj.academic_year_id:
        obj.academic_year_name = db.query(AcademicYear.name).filter(
            AcademicYear.id == obj.academic_year_id, AcademicYear.tenant_id == tenant_id
        ).scalar()
        
    if obj.class_id:
        obj.class_name = db.query(SchoolClass.name).filter(
            SchoolClass.id == obj.class_id, SchoolClass.tenant_id == tenant_id
        ).scalar()
        
    return obj


def create_fee_category(db: Session, obj_in: FeeCategoryCreate, tenant_id: int, user_id: int | None) -> FeeCategory:
    """Create a new fee category. Code is auto-derived from name + academic year for uniqueness."""
    name = obj_in.name.strip()
    base_code = name[:4].upper().replace(" ", "")

    if obj_in.class_id is not None:
        require_active_class(db, tenant_id, int(obj_in.class_id))

    # Fetch academic year code to make the auto-code unique across years
    ay_code = ""
    if obj_in.academic_year_id:
        ay = db.query(AcademicYear).filter(
            AcademicYear.id == obj_in.academic_year_id,
            AcademicYear.tenant_id == tenant_id,
        ).first()
        if ay:
            ay_code = ay.code

    # Build initial code candidate
    code_candidate = obj_in.code if obj_in.code else (f"{base_code}_{ay_code}" if ay_code else base_code)

    # Check for existing category with same name + academic year + class for this tenant
    existing = db.query(FeeCategory).filter(
        FeeCategory.tenant_id == tenant_id,
        FeeCategory.name == name,
        FeeCategory.academic_year_id == obj_in.academic_year_id,
        FeeCategory.class_id == obj_in.class_id,
        FeeCategory.status == True,
    ).first()
    if existing:
        raise ConflictException("A fee category with this name already exists for the selected academic year and class.")

    # Ensure code is unique within tenant — append numeric suffix if needed
    suffix = 1
    code = code_candidate
    while db.query(FeeCategory).filter(
        FeeCategory.tenant_id == tenant_id,
        FeeCategory.code == code,
    ).first():
        code = f"{code_candidate}{suffix}"
        suffix += 1

    db_obj = FeeCategory(
        id=str(uuid4()),
        tenant_id=tenant_id,
        name=name,
        code=code,
        description=obj_in.description,
        status=obj_in.status if obj_in.status is not None else True,
        academic_year_id=obj_in.academic_year_id,
        class_id=obj_in.class_id,
        amount=obj_in.amount,
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

    if "amount" in update_data:
        _sync_fee_structure_totals_for_category(db, tenant_id, category_id)

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
    from app.models.academic import ClassDivision
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
    div_ids = list({s.class_division_id for s in structures if s.class_division_id})
    category_ids = set()
    for s in structures:
        category_ids.update(_structure_category_ids(s))
        if s.fee_category_id:
            category_ids.add(str(s.fee_category_id))
    category_ids = list(category_ids)
    year_ids = list({s.academic_year_id for s in structures if s.academic_year_id})

    class_map = {}
    if class_ids:
        classes = db.query(SchoolClass.id, SchoolClass.name).filter(
            SchoolClass.id.in_(class_ids), SchoolClass.tenant_id == tenant_id
        ).all()
        class_map = {c.id: c.name for c in classes}

    div_map = {}
    if div_ids:
        divs = db.query(ClassDivision.id, ClassDivision.division_name).filter(
            ClassDivision.id.in_(div_ids)
        ).all()
        div_map = {d.id: d.division_name for d in divs}


    category_map = {}
    category_amount_map = {}
    if category_ids:
        categories = db.query(FeeCategory.id, FeeCategory.name, FeeCategory.amount).filter(
            FeeCategory.id.in_(category_ids), FeeCategory.tenant_id == tenant_id
        ).all()
        category_map = {str(c.id): c.name for c in categories}
        category_amount_map = {str(c.id): float(c.amount or 0) for c in categories}

    year_map = {}
    if year_ids:
        years = db.query(AcademicYear.id, AcademicYear.name).filter(
            AcademicYear.id.in_(year_ids), AcademicYear.tenant_id == tenant_id
        ).all()
        year_map = {y.id: y.name for y in years}

    # Enrich with names
    for s in structures:
        s.class_name = class_map.get(s.class_id)
        s.class_division_name = div_map.get(s.class_division_id)
        
        # Load multi-category array and compute joined name
        if s.multi_category_ids:
            # e.g., "id1,id2"
            s.fee_category_ids = [cid.strip() for cid in s.multi_category_ids.split(",") if cid.strip()]
            resolved_names = [category_map.get(cid) for cid in s.fee_category_ids if category_map.get(cid)]
            s.fee_category_name = " + ".join(resolved_names) if resolved_names else category_map.get(str(s.fee_category_id))
        else:
            s.fee_category_ids = []
            s.fee_category_name = category_map.get(str(s.fee_category_id))
            
        s.academic_year_name = year_map.get(s.academic_year_id)
        linked_ids = _structure_category_ids(s)
        if linked_ids:
            s.total_amount = float(sum(category_amount_map.get(cid, 0.0) for cid in linked_ids))
        
    # Deduplicate by unique DB id (since we don't want to over-filter distinct setups)
    unique_structures = []
    seen = set()
    for s in structures:
        if s.id not in seen:
            seen.add(s.id)
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

    from app.models.academic import ClassDivision
    if obj.class_division_id:
        obj.class_division_name = db.query(ClassDivision.division_name).filter(
            ClassDivision.id == obj.class_division_id
        ).scalar()
    else:
        obj.class_division_name = None

    # Load multi-category array and compute joined name
    if obj.multi_category_ids:
        obj.fee_category_ids = [cid.strip() for cid in obj.multi_category_ids.split(",") if cid.strip()]
        resolved_names = []
        for cid in obj.fee_category_ids:
            cat_name = db.query(FeeCategory.name).filter(
                FeeCategory.id == cid, FeeCategory.tenant_id == tenant_id
            ).scalar()
            if cat_name:
                resolved_names.append(cat_name)
        obj.fee_category_name = " + ".join(resolved_names) if resolved_names else None
    else:
        obj.fee_category_ids = []
        obj.fee_category_name = db.query(FeeCategory.name).filter(
            FeeCategory.id == str(obj.fee_category_id), FeeCategory.tenant_id == tenant_id
        ).scalar()

    obj.academic_year_name = db.query(AcademicYear.name).filter(
        AcademicYear.id == obj.academic_year_id, AcademicYear.tenant_id == tenant_id
    ).scalar()

    return obj

def create_fee_structure(db: Session, obj_in: FeeStructureCreate, tenant_id: int, user_id: int) -> FeeStructure:
    # Verify the class exists and is active for this tenant
    require_active_class(db, tenant_id, obj_in.class_id)
    require_active_division(db, tenant_id, obj_in.class_id, obj_in.class_division_id)

    # User explicitly wants multiple fee structures for same class + category + year 
    # so we no longer do the ConflictException check here.

    # Fetch category to get the name for the structure's name field
    category = db.query(FeeCategory).filter(FeeCategory.id == obj_in.fee_category_id).first()
    category_name = category.name if category else ""

    db_obj = FeeStructure(
        tenant_id=tenant_id,
        class_id=obj_in.class_id,
        class_division_id=obj_in.class_division_id,
        fee_category_id=obj_in.fee_category_id,
        academic_year_id=obj_in.academic_year_id,
        total_amount=obj_in.total_amount,
        installment_type=obj_in.installment_type,
        num_installments=obj_in.num_installments,
        description=obj_in.description,
        name=obj_in.name if obj_in.name else category_name,
        is_active=obj_in.is_active,
        multi_category_ids=",".join(obj_in.fee_category_ids) if obj_in.fee_category_ids else None,
        created_by=user_id
    )
    db.add(db_obj)
    db.flush()  # Get ID

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

    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_fee_structure(db: Session, structure_id: int, obj_in: FeeStructureUpdate, tenant_id: int, user_id: int) -> FeeStructure:
    db_obj = get_fee_structure(db, structure_id, tenant_id)

    update_data = obj_in.model_dump(exclude={"installments"}, exclude_unset=True)
    
    fee_category_ids = update_data.pop("fee_category_ids", None)
    if fee_category_ids is not None:
        db_obj.multi_category_ids = ",".join(fee_category_ids)

    for field, value in update_data.items():
        if hasattr(db_obj, field):
            setattr(db_obj, field, value)

    db_obj.updated_at = datetime.utcnow()
    db_obj.updated_by = user_id

    if obj_in.installments is not None:
        db.query(FeeInstallment).filter(FeeInstallment.fee_structure_id == db_obj.id).delete()
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

    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_fee_structure(db: Session, structure_id: int, tenant_id: int, user_id: int) -> None:
    db_obj = get_fee_structure(db, structure_id, tenant_id)

    db_obj.is_deleted = True
    db_obj.deleted_at = datetime.utcnow()
    db_obj.deleted_by = user_id

    # Soft delete installments too
    db.query(FeeInstallment).filter(FeeInstallment.fee_structure_id == db_obj.id).update({
        "is_deleted": True,
        "deleted_at": datetime.utcnow(),
        "deleted_by": user_id
    })

    db.commit()


def get_fee_due_list_v2(
    db: Session,
    *,
    tenant_id: int,
    academic_year_id: int,
    class_id: int | None = None,
    installment: str | None = None,
    search: str | None = None,
    status_filter: str = "ALL",
    page: int = 1,
    page_size: int = 10,
) -> dict:
    """
    Return due-fee list (installment + invoice) with summary and pagination.
    """
    try:
        normalized_status = (status_filter or "ALL").strip().upper()
        if normalized_status not in {"ALL", "DUE", "OVERDUE"}:
            raise AppException("Invalid status. Allowed values: ALL, DUE, OVERDUE", status_code=422)

        today = date.today()

        payment_agg_sq = (
            db.query(
                FeePayment.tenant_id.label("tenant_id"),
                FeePayment.fee_installment_id.label("installment_id"),
                func.sum(func.coalesce(FeePayment.paid_amount, FeePayment.total_amount, 0)).label("paid_amount"),
            )
            .filter(
                FeePayment.tenant_id == tenant_id,
                FeePayment.fee_installment_id.isnot(None),
            )
            .group_by(FeePayment.tenant_id, FeePayment.fee_installment_id)
            .subquery()
        )

        due_amount_expr = (
            func.coalesce(StudentFeeInstallment.amount, 0) - func.coalesce(payment_agg_sq.c.paid_amount, 0)
        )
        base_query = (
            db.query(
                Student.id.label("student_id"),
                Student.student_name.label("student_name"),
                SchoolClass.name.label("class_name"),
                func.coalesce(StudentInvoice.installment, cast(StudentFeeInstallment.installment_no, String)).label(
                    "installment"
                ),
                StudentInvoice.id.label("invoice_row_id"),
                StudentInvoice.invoice_no.label("invoice_id"),
                due_amount_expr.label("due_amount"),
                StudentFeeInstallment.due_date.label("due_date"),
            )
            .join(
                StudentFeeAssignment,
                StudentFeeAssignment.student_id == Student.id,
            )
            .join(
                StudentFeeInstallment,
                StudentFeeInstallment.assignment_id == StudentFeeAssignment.id,
            )
            .outerjoin(
                FeeInstallment,
                and_(
                    FeeInstallment.fee_structure_id == StudentFeeAssignment.fee_structure_id,
                    FeeInstallment.installment_number == StudentFeeInstallment.installment_no,
                    FeeInstallment.is_deleted == False,  # noqa: E712
                ),
            )
            .join(
                SchoolClass,
                SchoolClass.id == Student.class_id,
            )
            .outerjoin(
                StudentInvoice,
                and_(
                    StudentInvoice.tenant_id == tenant_id,
                    StudentInvoice.student_id == Student.id,
                    StudentInvoice.academic_year_id == academic_year_id,
                    or_(
                        StudentInvoice.fee_installment_id == FeeInstallment.id,
                        and_(
                            StudentInvoice.fee_installment_id.is_(None),
                            StudentInvoice.due_date == StudentFeeInstallment.due_date,
                        ),
                    ),
                ),
            )
            .outerjoin(
                payment_agg_sq,
                and_(
                    payment_agg_sq.c.tenant_id == tenant_id,
                    payment_agg_sq.c.installment_id == StudentFeeInstallment.id,
                ),
            )
            .filter(
                Student.tenant_id == tenant_id,
                SchoolClass.tenant_id == tenant_id,
                Student.academic_year_id == academic_year_id,
                StudentFeeAssignment.academic_year_id == academic_year_id,
                StudentInvoice.id.isnot(None),
                func.upper(StudentInvoice.status).in_(["PARTIAL", "PENDING"]),
                due_amount_expr > 0,
            )
        )

        if class_id is not None:
            base_query = base_query.filter(Student.class_id == class_id)

        if search:
            term = f"%{search.strip()}%"
            base_query = base_query.filter(
                or_(
                    Student.student_name.ilike(term),
                    StudentInvoice.invoice_no.ilike(term),
                )
            )

        if installment:
            base_query = base_query.filter(StudentInvoice.installment == installment.strip())

        if normalized_status == "DUE":
            base_query = base_query.filter(StudentFeeInstallment.due_date >= today)
        elif normalized_status == "OVERDUE":
            base_query = base_query.filter(StudentFeeInstallment.due_date < today)

        summary_query = (
            db.query(
                func.coalesce(func.sum(due_amount_expr), 0).label("total_due"),
                func.count(func.distinct(case((StudentFeeInstallment.due_date < today, Student.id)))).label(
                    "overdue_students"
                ),
            )
            .select_from(Student)
            .join(StudentFeeAssignment, StudentFeeAssignment.student_id == Student.id)
            .join(StudentFeeInstallment, StudentFeeInstallment.assignment_id == StudentFeeAssignment.id)
            .outerjoin(
                FeeInstallment,
                and_(
                    FeeInstallment.fee_structure_id == StudentFeeAssignment.fee_structure_id,
                    FeeInstallment.installment_number == StudentFeeInstallment.installment_no,
                    FeeInstallment.is_deleted == False,  # noqa: E712
                ),
            )
            .join(SchoolClass, SchoolClass.id == Student.class_id)
            .outerjoin(
                StudentInvoice,
                and_(
                    StudentInvoice.tenant_id == tenant_id,
                    StudentInvoice.student_id == Student.id,
                    StudentInvoice.academic_year_id == academic_year_id,
                    or_(
                        StudentInvoice.fee_installment_id == FeeInstallment.id,
                        and_(
                            StudentInvoice.fee_installment_id.is_(None),
                            StudentInvoice.due_date == StudentFeeInstallment.due_date,
                        ),
                    ),
                ),
            )
            .outerjoin(
                payment_agg_sq,
                and_(
                    payment_agg_sq.c.tenant_id == tenant_id,
                    payment_agg_sq.c.installment_id == StudentFeeInstallment.id,
                ),
            )
            .filter(
                Student.tenant_id == tenant_id,
                SchoolClass.tenant_id == tenant_id,
                Student.academic_year_id == academic_year_id,
                StudentFeeAssignment.academic_year_id == academic_year_id,
                StudentInvoice.id.isnot(None),
                func.upper(StudentInvoice.status).in_(["PARTIAL", "PENDING"]),
                due_amount_expr > 0,
            )
        )

        if class_id is not None:
            summary_query = summary_query.filter(Student.class_id == class_id)
        if search:
            term = f"%{search.strip()}%"
            summary_query = summary_query.filter(
                or_(
                    Student.student_name.ilike(term),
                    StudentInvoice.invoice_no.ilike(term),
                )
            )
        if installment:
            summary_query = summary_query.filter(StudentInvoice.installment == installment.strip())
        if normalized_status == "DUE":
            summary_query = summary_query.filter(StudentFeeInstallment.due_date >= today)
        elif normalized_status == "OVERDUE":
            summary_query = summary_query.filter(StudentFeeInstallment.due_date < today)

        total = base_query.count()
        offset = (page - 1) * page_size
        rows = (
            base_query.order_by(StudentFeeInstallment.due_date.asc(), Student.student_name.asc(), Student.id.asc())
            .offset(offset)
            .limit(page_size)
            .all()
        )

        summary_row = summary_query.one()
        data = [
            {
                "student_id": int(row.student_id),
                "student_name": str(row.student_name),
                "class_name": row.class_name,
                "installment": str(row.installment or ""),
                "invoice_row_id": int(row.invoice_row_id) if row.invoice_row_id is not None else None,
                "invoice_id": row.invoice_id,
                "due_amount": float(row.due_amount or 0),
                "due_date": row.due_date,
                "days_overdue": (today - row.due_date).days if row.due_date and row.due_date < today else 0,
                "status": "OVERDUE" if row.due_date and row.due_date < today else "DUE",
            }
            for row in rows
        ]

        return {
            "summary": {
                "total_due": float(summary_row.total_due or 0),
                "overdue_students": int(summary_row.overdue_students or 0),
            },
            "data": data,
            "total": total,
            "page": page,
            "page_size": page_size,
        }
    except AppException:
        raise
    except Exception as exc:
        logger.exception("Failed to fetch fee due list v2: %s", exc)
        raise AppException("Unable to fetch fee due list at the moment", status_code=400)
