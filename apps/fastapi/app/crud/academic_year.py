from sqlalchemy import text
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List, Optional
from datetime import datetime
from app.models.academic import AcademicYear
from app.schemas.academic import AcademicYearCreate, AcademicYearUpdate

def get_all(db: Session, tenant_id: int, *, active_only: bool = False) -> List[AcademicYear]:
    """List academic years for a tenant. Uses raw SQL when active_only for SQL Server BIT safety."""
    if active_only:
        rows = db.execute(
            text(
                """
                SELECT id
                FROM academic_years
                WHERE tenant_id = :tenant_id
                  AND is_deleted = 0
                  AND is_active = 1
                ORDER BY start_date DESC, id DESC
                """
            ),
            {"tenant_id": tenant_id},
        ).fetchall()
        if not rows:
            return []
        ids = [row[0] for row in rows]
        return (
            db.query(AcademicYear)
            .filter(AcademicYear.id.in_(ids))
            .order_by(AcademicYear.start_date.desc(), AcademicYear.id.desc())
            .all()
        )

    return (
        db.query(AcademicYear)
        .filter(
            AcademicYear.tenant_id == tenant_id,
            AcademicYear.is_deleted == False,  # noqa: E712
        )
        .order_by(AcademicYear.start_date.desc(), AcademicYear.id.desc())
        .all()
    )

def get_by_id(db: Session, id: int, tenant_id: int) -> Optional[AcademicYear]:
    return db.query(AcademicYear).filter(
        AcademicYear.id == id,
        AcademicYear.tenant_id == tenant_id,
        AcademicYear.is_deleted == False  # noqa: E712
    ).first()

def create(db: Session, data: AcademicYearCreate, tenant_id: int, created_by: int) -> AcademicYear:
    if data.end_date <= data.start_date:
        raise HTTPException(status_code=400, detail="End date must be after start date.")
    
    existing = db.query(AcademicYear).filter(
        AcademicYear.code == data.code,
        AcademicYear.tenant_id == tenant_id,
        AcademicYear.is_deleted == False  # noqa: E712
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="code must be unique per tenant")

    db_obj = AcademicYear(
        tenant_id=tenant_id,
        name=data.name,
        code=data.code,
        start_date=data.start_date,
        end_date=data.end_date,
        is_active=data.is_active,
        is_current=False,
        created_by=created_by,
        created_at=datetime.utcnow()
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update(db: Session, id: int, data: AcademicYearUpdate, tenant_id: int, updated_by: int) -> AcademicYear:
    db_obj = get_by_id(db, id, tenant_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Academic year not found")
    
    update_data = data.model_dump(exclude_unset=True)
    
    if "start_date" in update_data or "end_date" in update_data:
        new_start = update_data.get("start_date", db_obj.start_date)
        new_end = update_data.get("end_date", db_obj.end_date)
        if new_end <= new_start:
            raise HTTPException(status_code=400, detail="End date must be after start date.")
            
    if "code" in update_data and update_data["code"] != db_obj.code:
        existing = db.query(AcademicYear).filter(
            AcademicYear.code == update_data["code"],
            AcademicYear.tenant_id == tenant_id,
            AcademicYear.is_deleted == False  # noqa: E712
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="code must be unique per tenant")

    for key, value in update_data.items():
        setattr(db_obj, key, value)
        
    db_obj.updated_by = updated_by
    db_obj.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(db_obj)
    return db_obj

def soft_delete(db: Session, id: int, tenant_id: int, deleted_by: int):
    db_obj = get_by_id(db, id, tenant_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Academic year not found")
        
    db_obj.is_deleted = True
    db_obj.deleted_by = deleted_by
    db_obj.deleted_at = datetime.utcnow()
    
    db.commit()
