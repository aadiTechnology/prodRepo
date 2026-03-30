"""Reporting endpoints."""

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.schemas.auth import CurrentUser
from app.schemas.sprint_performance_report_schema import SprintPerformanceReportResponse
from app.services import sprint_performance_report_service

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/sprint-performance", response_model=SprintPerformanceReportResponse)
def get_sprint_performance(
    sprint_name: str | None = Query(
        default=None,
        description="Sprint number as string (matches int Sprint column).",
    ),
    team_name: str | None = Query(
        default=None,
        description="Filters FeatureName (LIKE %value%) — proxy until a Team column exists.",
    ),
    employee_id: int | None = Query(default=None, description="User id; filters OwnerName to that user's full name."),
    owner_name: str | None = Query(
        default=None,
        description="Exact match on OwnerName (alternative to employee_id).",
    ),
    activity_type: str | None = Query(
        default=None,
        description="Filters TaskType (LIKE %value%).",
    ),
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
    _current_user: CurrentUser = Depends(get_current_user),
) -> SprintPerformanceReportResponse:
    """Full timesheet rows for the report (no pagination) plus rollups."""
    return sprint_performance_report_service.get_sprint_performance_report(
        db,
        sprint_name=sprint_name,
        team_name=team_name,
        employee_id=employee_id,
        owner_name=owner_name,
        activity_type=activity_type,
        from_date=from_date,
        to_date=to_date,
    )
