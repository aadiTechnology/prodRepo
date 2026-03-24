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
    print(f"Incoming academicYear={academicYear}, classId={classId}, tenantId={tenantId}")
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
    print(f"Total records returned: {len(fee_structures)}")
    result = [
        {
            "id": f.id,
            "name": getattr(f, "name", f"Fee Structure #{f.id}")
        }
        for f in fee_structures
    ]
    return result
