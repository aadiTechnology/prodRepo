from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import CurrentUser
from app.routers.installment_tracking import require_installment_tracking_access
from app.schemas.fee_installment_status import FeeInstallmentStatusResponse
from app.services.fee_installment_status_service import get_fee_installment_status

router = APIRouter(prefix="/api/fees", tags=["Fees - Installment Status"])


@router.get("/installment-status", response_model=FeeInstallmentStatusResponse)
async def fee_installment_status(
    student_id: int = Query(..., ge=1),
    academic_year_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_installment_tracking_access),
):
    return get_fee_installment_status(
        db,
        tenant_id=current_user.tenant_id,
        student_id=student_id,
        academic_year_id=academic_year_id,
    )

