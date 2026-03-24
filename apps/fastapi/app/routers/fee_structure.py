from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.schemas.auth import CurrentUser
from app.models.fee import FeeStructure

router = APIRouter(prefix="/api/fee-structures", tags=["Fee Structures"])

@router.get("")
def list_fee_structures(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="User does not belong to a tenant")
    
    fee_structures = db.query(FeeStructure).filter(
        FeeStructure.tenant_id == current_user.tenant_id,
        FeeStructure.is_deleted == False
    ).all()
    
    return [
        {
            "id": f.id,
            "name": f.name,
            "total_amount": f.total_amount,
            "fee_category_id": f.fee_category_id
        }
        for f in fee_structures
    ]
