from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.fee import FeeStructure
from app.services.fee_service import apply_category_total_to_structure

router = APIRouter(prefix="/api/fee-structures", tags=["Fee Structures"])

@router.get("")
def list_fee_structures(
    academicYear: int = Query(..., alias="academicYear"),
    classId: int = Query(..., alias="classId"),
    tenantId: int = Query(..., alias="tenantId"),
    classDivisionId: int | None = Query(None, alias="classDivisionId"),
    db: Session = Depends(get_db)
):
    query = db.query(FeeStructure).filter(
        FeeStructure.academic_year_id == academicYear,
        FeeStructure.class_id == classId,
        FeeStructure.tenant_id == tenantId,
        FeeStructure.is_active == True
    )

    # Division rule:
    # - if division selected: include generic (no division) + selected division
    # - if no division selected: include only generic (no division)
    if classDivisionId is None:
        query = query.filter(FeeStructure.class_division_id.is_(None))
    else:
        query = query.filter(
            or_(
                FeeStructure.class_division_id.is_(None),
                FeeStructure.class_division_id == classDivisionId
            )
        )

    fee_structures = query.all()
    result = []
    for f in fee_structures:
        # Always use fee structure name if present, otherwise fallback to 'Fee Structure #{id}'
        display_name = f.name.strip() if f.name and f.name.strip() != "" else f"Fee Structure #{f.id}"
        total_amount, installment_rows = apply_category_total_to_structure(db, tenantId, f)
        installments = [
            {
                "installment_number": int(inst.installment_number or index + 1),
                "amount": float(inst.amount or 0),
                "due_date": inst.due_date.isoformat() if inst.due_date else None,
            }
            for index, inst in enumerate(installment_rows)
        ]
        result.append({
            "id": f.id,
            "name": display_name,
            "total_amount": total_amount,
            "installment_type": f.installment_type,
            "num_installments": len(installments) or int(f.num_installments or 0),
            "installments": installments,
        })
    return result
