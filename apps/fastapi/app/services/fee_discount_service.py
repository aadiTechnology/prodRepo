
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from app.models.fee_discount import FeeDiscount
from app.schemas.fee_discount import FeeDiscountCreate, FeeDiscountUpdate
from fastapi import HTTPException, status
from sqlalchemy import or_

def get_discount_by_id(db: Session, tenant_id: int, discount_id: int):
    # Do NOT filter by status, so inactive discounts can be edited
    return db.query(FeeDiscount).filter(
        FeeDiscount.id == discount_id,
        FeeDiscount.tenant_id == tenant_id
    ).first()

def create_discount(db: Session, tenant_id: int, data: FeeDiscountCreate):
    # Check for duplicate name per tenant
    existing = db.query(FeeDiscount).filter(
        FeeDiscount.tenant_id == tenant_id,
        FeeDiscount.discount_name == data.discount_name,
        FeeDiscount.status == True
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Discount name already exists")
    try:
        discount = FeeDiscount(
            tenant_id=tenant_id,
            discount_name=data.discount_name,
            discount_type=data.discount_type,
            discount_value=data.discount_value,
            fee_category=data.fee_category,
            applicable_class=data.applicable_class,
            description=data.description,
            status=data.status
        )
        db.add(discount)
        db.commit()
        db.refresh(discount)
        return discount
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error")

def get_discounts(db: Session, tenant_id: int, search: str = None, page: int = 1, page_size: int = 10):
    # Only return active (not deleted) discounts
    query = db.query(FeeDiscount).filter(
        FeeDiscount.tenant_id == tenant_id,
        FeeDiscount.is_deleted == False
    )
    print("DEBUG SQL QUERY:", str(query.statement))
    if search:
        query = query.filter(FeeDiscount.discount_name.ilike(f"%{search}%"))
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
    if data.discount_name and data.discount_name != discount.discount_name:
        # Check for duplicate name
        existing = db.query(FeeDiscount).filter(
            FeeDiscount.tenant_id == tenant_id,
            FeeDiscount.discount_name == data.discount_name,
            FeeDiscount.id != discount_id,
            FeeDiscount.status == True
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Discount name already exists")
    try:
        for field, value in data.dict(exclude_unset=True).items():
            setattr(discount, field, value)
        db.commit()
        db.refresh(discount)
        return discount
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error")

def delete_discount(db: Session, tenant_id: int, discount_id: int):
    discount = db.query(FeeDiscount).filter(
        FeeDiscount.id == discount_id,
        FeeDiscount.tenant_id == tenant_id,
        FeeDiscount.is_deleted == False
    ).first()
    if not discount:
        raise HTTPException(status_code=404, detail="Discount not found")
    try:
        discount.is_deleted = True
        db.commit()
        return True
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error")
