"""Sprint performance report — orchestration and validation."""

from datetime import date

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.repositories.timesheet_report_repository import compute_aggregations, fetch_entries
from app.models.user import User
from app.schemas.sprint_performance_report_schema import (
    SprintPerformanceAggregations,
    SprintPerformanceReportResponse,
    TimesheetEntryRow,
)


def get_sprint_performance_report(
    db: Session,
    *,
    sprint_name: str | None,
    team_name: str | None,
    employee_id: int | None,
    owner_name: str | None,
    activity_type: str | None,
    from_date: date | None,
    to_date: date | None,
) -> SprintPerformanceReportResponse:
    resolved_owner: str | None = None
    if employee_id is not None:
        user = db.query(User).filter(User.id == employee_id, User.is_deleted == False).first()
        if not user:
            raise HTTPException(status_code=404, detail="Employee not found")
        resolved_owner = user.full_name
    elif owner_name and owner_name.strip():
        resolved_owner = owner_name.strip()

    raw_rows = fetch_entries(
        db,
        sprint_name=sprint_name,
        team_name=team_name,
        owner_name=resolved_owner,
        activity_type=activity_type,
        from_date=from_date,
        to_date=to_date,
    )

    agg = compute_aggregations(raw_rows)

    rows = [TimesheetEntryRow.model_validate(r) for r in raw_rows]
    aggregations = SprintPerformanceAggregations.model_validate(agg)

    return SprintPerformanceReportResponse(rows=rows, aggregations=aggregations)
