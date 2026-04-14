from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.fee import FeeStructure

router = APIRouter(prefix="/api/fee-structures", tags=["Fee Structures"])

@router.get("")
def list_fee_structures(
    academicYear: int = Query(..., alias="academicYear"),
    classId: int = Query(..., alias="classId"),
    tenantId: int = Query(..., alias="tenantId"),
    db: Session = Depends(get_db)
):
    fee_structures = (
        db.query(FeeStructure)
        .filter(
            FeeStructure.academic_year_id == academicYear,
            FeeStructure.class_id == classId,
            FeeStructure.tenant_id == tenantId,
            FeeStructure.is_active == True
        )
        .all()
    )
    result = []
    for f in fee_structures:
        # Always use fee structure name if present, otherwise fallback to 'Fee Structure #{id}'
        display_name = f.name.strip() if f.name and f.name.strip() != "" else f"Fee Structure #{f.id}"
        result.append({
            "id": f.id,
            "name": display_name,
            "total_amount": float(f.total_amount or 0),
        })
    return result
