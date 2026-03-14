from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.fee import FeeStructure

router = APIRouter(prefix="/api/fee-structures", tags=["Fee Structures"])

@router.get("")
def list_fee_structures(db: Session = Depends(get_db)):
    fee_structures = db.query(FeeStructure).all()
    print("DEBUG fee_structures:", fee_structures)
    for f in fee_structures:
        print(f"DEBUG FeeStructure id={f.id} total_amount={f.total_amount}")
    return [
        {
            "id": f.id,
            "name": f.name,
            "total_amount": f.total_amount,
            "fee_category_id": f.fee_category_id
        }
        for f in fee_structures
    ]
