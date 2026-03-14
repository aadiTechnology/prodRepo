from fastapi import APIRouter, Depends, Query, Path, Body, status, HTTPException, Request
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.schemas.fee_discount import FeeDiscountCreate, FeeDiscountUpdate, FeeDiscountResponse
from app.services import fee_discount_service
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/fees/discounts", tags=["Fee Discounts"])

# Dependency to get tenant_id from Authorization token
from app.utils.security import decode_access_token

def get_tenant_id(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = auth_header.split(" ", 1)[1]
    payload = decode_access_token(token)
    if not payload or "tenant_id" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or missing tenant_id in token")
    return payload["tenant_id"]

@router.post("", status_code=status.HTTP_201_CREATED, response_model=FeeDiscountResponse)
@router.post("/", status_code=status.HTTP_201_CREATED, response_model=FeeDiscountResponse)
def create_discount(
    data: FeeDiscountCreate = Body(...),
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id)
):
    discount = fee_discount_service.create_discount(db, tenant_id, data)
    return FeeDiscountResponse.from_orm(discount)

@router.get("", response_model=dict)
@router.get("/", response_model=dict)
def list_discounts(
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100)
):
    try:
        discounts, total = fee_discount_service.get_discounts(db, tenant_id, search, page, page_size)
        response_data = [FeeDiscountResponse.from_orm(d).dict() for d in discounts]
        return {
            "data": response_data,
            "total": total
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{discount_id}", response_model=FeeDiscountResponse)
@router.get("/{discount_id}/", response_model=FeeDiscountResponse)
def get_discount(
    discount_id: int = Path(...),
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id)
):
    import logging
    logger = logging.getLogger("fee_discount")
    logger.info(f"GET /api/fees/discounts/{discount_id} called")
    discount = fee_discount_service.get_discount_by_id(db, tenant_id, discount_id)
    if not discount:
        logger.warning(f"Discount not found: {discount_id}")
        raise HTTPException(status_code=404, detail="Discount not found")
    logger.info(f"Discount found: {discount_id}")
    return FeeDiscountResponse.from_orm(discount)

@router.put("/{discount_id}", response_model=FeeDiscountResponse)
def update_discount(
    discount_id: int = Path(...),
    data: FeeDiscountUpdate = Body(...),
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id)
):
    discount = fee_discount_service.update_discount(db, tenant_id, discount_id, data)
    return FeeDiscountResponse.from_orm(discount)
@router.delete("/{discount_id}")
def delete_discount(
    discount_id: int = Path(...),
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id)
):
    fee_discount_service.delete_discount(db, tenant_id, discount_id)
    return {"message": "Discount deleted successfully"}
