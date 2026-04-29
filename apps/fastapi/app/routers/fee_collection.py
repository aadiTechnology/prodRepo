from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import CurrentUser
from app.core.exceptions import ValidationException
from app.routers.installment_tracking import require_installment_tracking_access
from app.schemas.fee_collection import (
    FeePaymentCollectRequest, 
    FeePaymentCollectResponse,
    InvoicePaymentCollectRequest
)
from app.services.fee_collection_service import collect_payment, collect_invoice_payment

router = APIRouter(prefix="/fees/collection", tags=["Fees - Collection"])


@router.post("", response_model=FeePaymentCollectResponse, status_code=status.HTTP_201_CREATED)
async def collect_fee_payment(
    payload: FeePaymentCollectRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_installment_tracking_access),
):
    # Use provided tenant_id or fallback to current_user.tenant_id
    effective_tenant_id = payload.tenant_id if payload.tenant_id is not None else current_user.tenant_id
    
    if effective_tenant_id is None:
        raise ValidationException("Tenant ID is required.")
    
    return collect_payment(
        db,
        tenant_id=effective_tenant_id,
        user_id=current_user.id,
        req=payload,
    )


@router.post("/invoice", response_model=FeePaymentCollectResponse, status_code=status.HTTP_201_CREATED)
async def collect_invoice_fee_payment(
    payload: InvoicePaymentCollectRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_installment_tracking_access),
):
    # Use provided tenant_id or fallback to current_user.tenant_id
    effective_tenant_id = payload.tenant_id if payload.tenant_id is not None else current_user.tenant_id
    
    if effective_tenant_id is None:
        raise ValidationException("Tenant ID is required.")
    
    return collect_invoice_payment(
        db,
        tenant_id=effective_tenant_id,
        user_id=current_user.id,
        req=payload,
    )

