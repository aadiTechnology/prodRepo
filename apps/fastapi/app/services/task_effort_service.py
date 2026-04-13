"""Business logic for user task effort entry."""

from datetime import date
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException, ValidationException
from app.repositories import task_effort_repository as repo
from app.schemas.task_effort import (
    EffortMutationResponse,
    LastEffortDefaultsResponse,
    TaskEffortListResponse,
    TaskEffortRow,
    TaskStatusItem,
)
from app.services.report_project_service import assert_can_access_pt_project


def list_statuses(db: Session) -> list[TaskStatusItem]:
    rows = repo.list_task_statuses(db)
    return [TaskStatusItem(status_id=r["status_id"], status_name=r["status_name"], sort_order=r["sort_order"]) for r in rows]


def get_active_sprint_id(db: Session, *, project_id: int, user_tenant_id: int | None) -> int | None:
    assert_can_access_pt_project(db, project_id, user_tenant_id)
    return repo.get_active_sprint_id(db, project_id=project_id)


def get_last_effort_defaults(
    db: Session, *, user_id: int, user_tenant_id: int | None
) -> LastEffortDefaultsResponse:
    row = repo.fetch_last_effort_defaults(db, user_id=user_id, user_tenant_id=user_tenant_id)
    if not row:
        return LastEffortDefaultsResponse()
    return LastEffortDefaultsResponse(
        project_id=row.get("project_id"),
        sprint_id=row.get("sprint_id"),
        feature_id=row.get("feature_id"),
        page_id=row.get("page_id"),
        effort_logged_on=row.get("effort_logged_on"),
    )


def list_my_tasks(
    db: Session,
    *,
    project_id: int,
    user_id: int,
    user_tenant_id: int | None,
    sprint_id: int,
    feature_id: int,
    page_id: int,
) -> TaskEffortListResponse:
    assert_can_access_pt_project(db, project_id, user_tenant_id)

    page_feature = repo.resolve_page_feature_id(db, project_id=project_id, page_id=page_id)
    if page_feature is None:
        raise ValidationException("Invalid page for this project.")
    if int(page_feature) != int(feature_id):
        raise ValidationException("Selected page does not belong to the selected feature.")

    rows = repo.fetch_user_tasks_for_page(
        db,
        project_id=project_id,
        user_id=user_id,
        sprint_id=sprint_id,
        feature_id=feature_id,
        page_id=page_id,
    )
    tasks = [
        TaskEffortRow(
            timesheet_id=r["timesheet_id"],
            task_name=r["task_name"],
            subtask_name=r["subtask_name"],
            status_id=r["status_id"],
            status_label=r["status_label"],
            total_effort=r["total_effort"],
            task_start_date=r["task_start_date"],
            task_end_date=r["task_end_date"],
            last_updated=r["last_updated"],
            is_closed=r["is_closed"],
        )
        for r in rows
    ]
    return TaskEffortListResponse(tasks=tasks)


def save_effort(
    db: Session,
    *,
    project_id: int,
    user_id: int,
    user_tenant_id: int | None,
    timesheet_id: int,
    working_date: date,
    effort_hours: Decimal,
) -> EffortMutationResponse:
    assert_can_access_pt_project(db, project_id, user_tenant_id)

    ts = repo.get_timesheet_row(db, project_id=project_id, user_id=user_id, timesheet_id=timesheet_id)
    if ts is None:
        raise NotFoundException("Timesheet", timesheet_id)
    if int(ts.get("status_id") or repo.STATUS_NOT_STARTED) == repo.STATUS_CLOSED:
        raise ValidationException("Closed tasks cannot accept effort.")

    repo.apply_effort_save(db, timesheet_id=timesheet_id, working_date=working_date, effort_hours=effort_hours)
    db.commit()

    updated = repo.fetch_user_task_by_id(db, project_id=project_id, user_id=user_id, timesheet_id=timesheet_id)
    if not updated:
        raise NotFoundException("Timesheet", timesheet_id)
    row = TaskEffortRow(
        timesheet_id=updated["timesheet_id"],
        task_name=updated["task_name"],
        subtask_name=updated["subtask_name"],
        status_id=updated["status_id"],
        status_label=updated["status_label"],
        total_effort=updated["total_effort"],
        task_start_date=updated["task_start_date"],
        task_end_date=updated["task_end_date"],
        last_updated=updated["last_updated"],
        is_closed=updated["is_closed"],
    )
    return EffortMutationResponse(ok=True, task=row)


def close_task(
    db: Session,
    *,
    project_id: int,
    user_id: int,
    user_tenant_id: int | None,
    timesheet_id: int,
    working_date: date,
) -> EffortMutationResponse:
    assert_can_access_pt_project(db, project_id, user_tenant_id)

    ts = repo.get_timesheet_row(db, project_id=project_id, user_id=user_id, timesheet_id=timesheet_id)
    if ts is None:
        raise NotFoundException("Timesheet", timesheet_id)
    if int(ts.get("status_id") or repo.STATUS_NOT_STARTED) == repo.STATUS_CLOSED:
        raise ValidationException("Task is already closed.")

    repo.close_timesheet(db, timesheet_id=timesheet_id, working_date=working_date)
    db.commit()

    updated = repo.fetch_user_task_by_id(db, project_id=project_id, user_id=user_id, timesheet_id=timesheet_id)
    if not updated:
        raise NotFoundException("Timesheet", timesheet_id)
    row = TaskEffortRow(
        timesheet_id=updated["timesheet_id"],
        task_name=updated["task_name"],
        subtask_name=updated["subtask_name"],
        status_id=updated["status_id"],
        status_label=updated["status_label"],
        total_effort=updated["total_effort"],
        task_start_date=updated["task_start_date"],
        task_end_date=updated["task_end_date"],
        last_updated=updated["last_updated"],
        is_closed=updated["is_closed"],
    )
    return EffortMutationResponse(ok=True, task=row)
