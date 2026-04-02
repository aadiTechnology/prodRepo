"""Reporting endpoints."""

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.schemas.auth import CurrentUser
from app.schemas.sprint_performance_report_schema import (
    SprintPerformanceFilterOptionsResponse,
    SprintPerformanceReportResponse,
)
from app.repositories.timesheet_report_repository import fetch_filter_options
from app.services import sprint_performance_report_service

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/sprint-performance", response_model=SprintPerformanceReportResponse)
def get_sprint_performance(
    sprint_id: int | None = Query(default=None, description="PT_Sprints.SprintId"),
    feature_id: int | None = Query(default=None, description="PT_Features.FeatureId"),
    owner_id: int | None = Query(default=None, description="PT_Owners.OwnerId"),
    task_id: int | None = Query(default=None, description="PT_Tasks.TaskId"),
    category_ids: list[int] | None = Query(
        default=None,
        description="PT_TaskCategories.CategoryId; task must map to any selected category.",
    ),
    sprint_name: str | None = Query(
        default=None,
        description="Legacy: sprint number as string. Prefer sprint_id.",
    ),
    team_name: str | None = Query(
        default=None,
        description="Legacy: filters FeatureName (LIKE %value%). Prefer feature_id.",
    ),
    employee_id: int | None = Query(default=None, description="User id; filters OwnerName to that user's full name."),
    owner_name: str | None = Query(
        default=None,
        description="Legacy: exact match on OwnerName. Prefer owner_id.",
    ),
    activity_type: str | None = Query(
        default=None,
        description="Legacy: filters task name (LIKE %value%). Prefer task_id.",
    ),
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
    _current_user: CurrentUser = Depends(get_current_user),
) -> SprintPerformanceReportResponse:
    """Full timesheet rows for the report (no pagination) plus rollups."""
    return sprint_performance_report_service.get_sprint_performance_report(
        db,
        sprint_id=sprint_id,
        feature_id=feature_id,
        owner_id=owner_id,
        task_id=task_id,
        category_ids=category_ids,
        sprint_name=sprint_name,
        team_name=team_name,
        employee_id=employee_id,
        owner_name=owner_name,
        activity_type=activity_type,
        from_date=from_date,
        to_date=to_date,
    )


@router.get("/sprint-performance/options", response_model=SprintPerformanceFilterOptionsResponse)
def get_sprint_performance_filter_options(
    db: Session = Depends(get_db),
    _current_user: CurrentUser = Depends(get_current_user),
) -> SprintPerformanceFilterOptionsResponse:
    return SprintPerformanceFilterOptionsResponse.model_validate(fetch_filter_options(db))
