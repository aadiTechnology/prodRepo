"""Fee Report router."""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.schemas.auth import CurrentUser
from app.schemas.fee_report_schema import FeeReportFilterOptions, FeeReportResponse
from app.services import fee_report_service

router = APIRouter(prefix="/fees/reports", tags=["Fees - Reports"])


@router.get("/options", response_model=FeeReportFilterOptions)
def get_report_filter_options(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> FeeReportFilterOptions:
    """Return dropdown options for the fee report filters."""
    return fee_report_service.get_filter_options(db, tenant_id=current_user.tenant_id)


@router.get("", response_model=FeeReportResponse)
def get_fee_report(
    page: int = Query(0, ge=0),
    size: int = Query(20, ge=1, le=100),
    academic_year_id: Optional[int] = Query(None, ge=1),
    class_id: Optional[int] = Query(None, ge=1),
    installment: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> FeeReportResponse:
    """
    Fee collection and dues report.
    Returns summary cards (Total Invoiced, Collected, Pending, Collection%)
    plus a paginated detail grid.
    """
    return fee_report_service.get_fee_report(
        db,
        tenant_id=current_user.tenant_id,
        page=page,
        size=size,
        academic_year_id=academic_year_id,
        class_id=class_id,
        installment=installment,
        start_date=start_date,
        end_date=end_date,
    )
