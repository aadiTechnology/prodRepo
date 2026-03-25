from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import CurrentUser
from app.routers.installment_tracking import require_installment_tracking_access
from app.schemas.fee_collection import FeePaymentCollectRequest, FeePaymentCollectResponse
from app.services.fee_collection_service import collect_payment

router = APIRouter(prefix="/fees/collection", tags=["Fees - Collection"])


@router.post("", response_model=FeePaymentCollectResponse, status_code=status.HTTP_201_CREATED)
async def collect_fee_payment(
    payload: FeePaymentCollectRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_installment_tracking_access),
):
    return collect_payment(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        req=payload,
    )

