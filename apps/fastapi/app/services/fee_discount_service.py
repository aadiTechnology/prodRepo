
from datetime import datetime

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from app.models.fee_discount import FeeDiscount
from app.schemas.fee_discount import FeeDiscountCreate, FeeDiscountUpdate
from fastapi import HTTPException, status
from sqlalchemy import and_, exists, or_

def get_discount_by_id(db: Session, tenant_id: int, discount_id: int):
    # Do NOT filter by status, so inactive discounts can be edited
    return db.query(FeeDiscount).filter(
        FeeDiscount.id == discount_id,
        FeeDiscount.tenant_id == tenant_id
    ).first()

def create_discount(db: Session, tenant_id: int, data: FeeDiscountCreate):
    discount_name = (data.discount_name or "").strip()[:120]
    fee_category = (data.fee_category or "").strip()
    if not fee_category:
        raise HTTPException(status_code=400, detail="Fee category is required")

    existing = db.query(FeeDiscount).filter(
        FeeDiscount.tenant_id == tenant_id,
        FeeDiscount.discount_name == discount_name,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Discount name already exists")
    try:
        now = datetime.utcnow()
        discount = FeeDiscount(
            tenant_id=tenant_id,
            discount_name=discount_name,
            discount_type=data.discount_type,
            discount_value=data.discount_value,
            fee_category=fee_category,
            applicable_class=(data.applicable_class or "").strip() or None,
            description=data.description,
            status=data.status if data.status is not None else True,
            is_deleted=False,
            created_at=now,
            updated_at=now,
        )
        db.add(discount)
        db.commit()
        db.refresh(discount)
        return discount
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Discount name already exists")
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error")

def _apply_academic_year_filter(query, tenant_id: int, academic_year_id: int):
    from app.models.fee import FeeCategory
    from app.models.academic import SchoolClass

    cat_exists = exists().where(
        and_(
            FeeCategory.tenant_id == tenant_id,
            FeeCategory.academic_year_id == academic_year_id,
            FeeCategory.status == True,  # noqa: E712
            FeeCategory.name == FeeDiscount.fee_category,
        )
    )
    class_exists = exists().where(
        and_(
            SchoolClass.tenant_id == tenant_id,
            SchoolClass.academic_year_id == academic_year_id,
            SchoolClass.is_deleted == False,  # noqa: E712
            SchoolClass.name == FeeDiscount.applicable_class,
        )
    )
    has_cat = and_(
        FeeDiscount.fee_category.isnot(None),
        FeeDiscount.fee_category != "",
    )
    has_class = and_(
        FeeDiscount.applicable_class.isnot(None),
        FeeDiscount.applicable_class != "",
    )
    return query.filter(
        or_(
            and_(has_cat, has_class, cat_exists, class_exists),
            and_(has_cat, ~has_class, cat_exists),
            and_(~has_cat, has_class, class_exists),
        )
    )


def get_all_discount_names(
    db: Session, tenant_id: int, academic_year_id: int = None
) -> list[str]:
    """Distinct discount names for the tenant (all statuses), optionally scoped to an academic year."""
    query = db.query(FeeDiscount).filter(FeeDiscount.tenant_id == tenant_id)
    if academic_year_id:
        query = _apply_academic_year_filter(query, tenant_id, academic_year_id)
    rows = query.order_by(FeeDiscount.discount_name.asc()).all()
    seen: set[str] = set()
    names: list[str] = []
    for row in rows:
        name = row.discount_name
        if not name:
            continue
        cleaned = name.strip()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            names.append(cleaned)
    names.sort(key=str.lower)
    return names


def get_discounts(
    db: Session,
    tenant_id: int,
    search: str = None,
    page: int = 1,
    page_size: int = 10,
    active_only: bool = True,
    academic_year_id: int = None,
):
    query = db.query(FeeDiscount).filter(FeeDiscount.tenant_id == tenant_id)
    if active_only:
        query = query.filter(FeeDiscount.status == True)
    if search:
        query = query.filter(FeeDiscount.discount_name.ilike(f"%{search}%"))
    if academic_year_id:
        query = _apply_academic_year_filter(query, tenant_id, academic_year_id)
    total = query.count()
    discounts = query.order_by(FeeDiscount.id.desc()).offset((page-1)*page_size).limit(page_size).all()
    return discounts, total

def update_discount(db: Session, tenant_id: int, discount_id: int, data: FeeDiscountUpdate):
    discount = db.query(FeeDiscount).filter(
        FeeDiscount.id == discount_id,
        FeeDiscount.tenant_id == tenant_id,
        FeeDiscount.status == True
    ).first()
    if not discount:
        raise HTTPException(status_code=404, detail="Discount not found")
    new_name = (data.discount_name or "").strip() if data.discount_name else None
    if new_name and new_name != discount.discount_name:
        existing = db.query(FeeDiscount).filter(
            FeeDiscount.tenant_id == tenant_id,
            FeeDiscount.discount_name == new_name,
            FeeDiscount.id != discount_id,
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Discount name already exists")
    try:
        updates = data.dict(exclude_unset=True)
        if "discount_name" in updates and updates["discount_name"]:
            updates["discount_name"] = updates["discount_name"].strip()
        if "fee_category" in updates:
            fc = (updates["fee_category"] or "").strip()
            if not fc:
                raise HTTPException(status_code=400, detail="Fee category is required")
            updates["fee_category"] = fc
        if "applicable_class" in updates:
            ac = (updates["applicable_class"] or "").strip()
            updates["applicable_class"] = ac or None
        for field, value in updates.items():
            setattr(discount, field, value)
        discount.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(discount)
        return discount
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Discount name already exists")
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error")

def delete_discount(db: Session, tenant_id: int, discount_id: int):
    discount = db.query(FeeDiscount).filter(
        FeeDiscount.id == discount_id,
        FeeDiscount.tenant_id == tenant_id
    ).first()
    if not discount:
        raise HTTPException(status_code=404, detail="Discount not found")
    try:
        discount.status = False  # Soft delete using status flag
        db.commit()
        return True
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error")
