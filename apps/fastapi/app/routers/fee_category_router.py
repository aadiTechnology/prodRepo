from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from app.core.database import get_db
from app.schemas.fee_category_schema import FeeCategoryResponse
from app.services import fee_category_service

router = APIRouter(prefix="/api/fee-categories", tags=["Fee Categories"])

def get_tenant_id():
    # Example: extract from token/session
    return 1

@router.get("/", response_model=List[FeeCategoryResponse])
def list_fee_categories(
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id)
):
    return fee_category_service.get_all_fee_categories(db, tenant_id)