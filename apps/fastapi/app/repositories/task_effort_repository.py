"""Persistence for user task effort entry (PT_Timesheets + PT_TimesheetEffortLogs)."""

from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy import and_, func, insert, select, update
from sqlalchemy.orm import Session

from app.models.pt_timesheet import (
    pt_pages,
    pt_sprints,
    pt_subtasks,
    pt_task_status,
    pt_task_type,
    pt_timesheet_effort_logs,
    pt_timesheets,
)

STATUS_NOT_STARTED = 1
STATUS_IN_PROGRESS = 2
STATUS_CLOSED = 3


def list_task_statuses(db: Session) -> list[dict[str, Any]]:
    rows = db.execute(
        select(pt_task_status.c.StatusId, pt_task_status.c.StatusName, pt_task_status.c.SortOrder).order_by(
            pt_task_status.c.SortOrder.asc(), pt_task_status.c.StatusId.asc()
        )
    ).all()
    return [
        {"status_id": int(r[0]), "status_name": r[1] or "", "sort_order": int(r[2] or 0)}
        for r in rows
    ]


def get_active_sprint_id(db: Session, *, project_id: int) -> int | None:
    row = db.execute(
        select(pt_sprints.c.SprintId)
        .where(and_(pt_sprints.c.ProjectId == project_id, pt_sprints.c.IsActive == 1))
        .order_by(pt_sprints.c.SprintId.desc())
    ).first()
    return int(row[0]) if row else None


def resolve_page_feature_id(db: Session, *, project_id: int, page_id: int) -> int | None:
    row = db.execute(
        select(pt_pages.c.FeatureId).where(
            and_(pt_pages.c.ProjectId == project_id, pt_pages.c.PageId == page_id)
        )
    ).first()
    return int(row[0]) if row and row[0] is not None else None


def fetch_user_tasks_for_page(
    db: Session,
    *,
    project_id: int,
    user_id: int,
    sprint_id: int,
    feature_id: int,
    page_id: int,
) -> list[dict[str, Any]]:
    ts = pt_timesheets
    tt = pt_task_type
    st = pt_subtasks
    ps = pt_task_status

    rows = db.execute(
        select(
            ts.c.TimesheetId,
            tt.c.TaskName,
            st.c.SubtaskName,
            ts.c.StatusId,
            ps.c.StatusName,
            ts.c.Efforts,
            ts.c.TaskStartDate,
            ts.c.TaskEndDate,
            ts.c.LastUpdated,
        )
        .select_from(
            ts.outerjoin(ps, ps.c.StatusId == ts.c.StatusId)
            .join(tt, tt.c.TaskId == ts.c.TaskId)
            .join(st, st.c.SubtaskId == ts.c.SubtaskId)
        )
        .where(
            and_(
                ts.c.ProjectId == project_id,
                ts.c.OwnerId == user_id,
                ts.c.SprintId == sprint_id,
                ts.c.FeatureId == feature_id,
                ts.c.PageId == page_id,
            )
        )
        .order_by(func.lower(tt.c.TaskName).asc(), func.lower(st.c.SubtaskName).asc(), ts.c.TimesheetId.asc())
    ).all()

    out: list[dict[str, Any]] = []
    for r in rows:
        sid = int(r[3]) if r[3] is not None else STATUS_NOT_STARTED
        out.append(
            {
                "timesheet_id": int(r[0]),
                "task_name": r[1] or "",
                "subtask_name": r[2] or "",
                "status_id": sid,
                "status_label": r[4] or "Not Started",
                "total_effort": float(r[5]) if r[5] is not None else None,
                "task_start_date": r[6],
                "task_end_date": r[7],
                "last_updated": r[8],
                "is_closed": sid == STATUS_CLOSED,
            }
        )
    return out


def fetch_user_task_by_id(
    db: Session, *, project_id: int, user_id: int, timesheet_id: int
) -> dict[str, Any] | None:
    ts = pt_timesheets
    tt = pt_task_type
    st = pt_subtasks
    ps = pt_task_status

    row = db.execute(
        select(
            ts.c.TimesheetId,
            tt.c.TaskName,
            st.c.SubtaskName,
            ts.c.StatusId,
            ps.c.StatusName,
            ts.c.Efforts,
            ts.c.TaskStartDate,
            ts.c.TaskEndDate,
            ts.c.LastUpdated,
        )
        .select_from(
            ts.outerjoin(ps, ps.c.StatusId == ts.c.StatusId)
            .join(tt, tt.c.TaskId == ts.c.TaskId)
            .join(st, st.c.SubtaskId == ts.c.SubtaskId)
        )
        .where(
            and_(
                ts.c.TimesheetId == timesheet_id,
                ts.c.ProjectId == project_id,
                ts.c.OwnerId == user_id,
            )
        )
    ).first()
    if not row:
        return None
    sid = int(row[3]) if row[3] is not None else STATUS_NOT_STARTED
    return {
        "timesheet_id": int(row[0]),
        "task_name": row[1] or "",
        "subtask_name": row[2] or "",
        "status_id": sid,
        "status_label": row[4] or "Not Started",
        "total_effort": float(row[5]) if row[5] is not None else None,
        "task_start_date": row[6],
        "task_end_date": row[7],
        "last_updated": row[8],
        "is_closed": sid == STATUS_CLOSED,
    }


def get_timesheet_row(
    db: Session, *, project_id: int, user_id: int, timesheet_id: int
) -> dict[str, Any] | None:
    ts = pt_timesheets
    row = db.execute(
        select(
            ts.c.TimesheetId,
            ts.c.OwnerId,
            ts.c.ProjectId,
            ts.c.StatusId,
            ts.c.Efforts,
        ).where(
            and_(
                ts.c.TimesheetId == timesheet_id,
                ts.c.ProjectId == project_id,
                ts.c.OwnerId == user_id,
            )
        )
    ).first()
    if not row:
        return None
    return {
        "timesheet_id": int(row[0]),
        "owner_id": int(row[1]) if row[1] is not None else None,
        "project_id": int(row[2]) if row[2] is not None else None,
        "status_id": int(row[3]) if row[3] is not None else STATUS_NOT_STARTED,
        "efforts": row[4],
    }


def insert_effort_log(
    db: Session,
    *,
    timesheet_id: int,
    working_date: date,
    effort_hours: Decimal,
) -> None:
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    db.execute(
        insert(pt_timesheet_effort_logs).values(
            TimesheetId=timesheet_id,
            WorkingDate=working_date,
            EffortHours=effort_hours,
            CreatedOn=now,
        )
    )


def apply_effort_save(
    db: Session,
    *,
    timesheet_id: int,
    working_date: date,
    effort_hours: Decimal,
) -> None:
    """Append log line and roll up cumulative effort + lifecycle fields on PT_Timesheets."""
    row = db.execute(
        select(
            pt_timesheets.c.StatusId,
            pt_timesheets.c.Efforts,
            pt_timesheets.c.TaskStartDate,
        ).where(pt_timesheets.c.TimesheetId == timesheet_id)
    ).first()
    if not row:
        return

    prev_eff = row[1]
    prev_start = row[2]
    raw_status = row[0]
    prev_status = int(raw_status) if raw_status is not None else STATUS_NOT_STARTED

    log_count = db.execute(
        select(func.count())
        .select_from(pt_timesheet_effort_logs)
        .where(pt_timesheet_effort_logs.c.TimesheetId == timesheet_id)
    ).scalar_one()
    is_first_log = int(log_count or 0) == 0

    new_total = (prev_eff or Decimal(0)) + effort_hours
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    patch: dict[str, Any] = {
        "Efforts": new_total,
        "LastUpdated": now,
    }

    if is_first_log or prev_status == STATUS_NOT_STARTED:
        patch["StatusId"] = STATUS_IN_PROGRESS
        if prev_start is None:
            patch["TaskStartDate"] = working_date

    insert_effort_log(
        db, timesheet_id=timesheet_id, working_date=working_date, effort_hours=effort_hours
    )

    db.execute(update(pt_timesheets).where(pt_timesheets.c.TimesheetId == timesheet_id).values(**patch))


def close_timesheet(
    db: Session,
    *,
    timesheet_id: int,
    working_date: date,
) -> None:
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    db.execute(
        update(pt_timesheets)
        .where(pt_timesheets.c.TimesheetId == timesheet_id)
        .values(
            StatusId=STATUS_CLOSED,
            TaskEndDate=working_date,
            LastUpdated=now,
        )
    )
