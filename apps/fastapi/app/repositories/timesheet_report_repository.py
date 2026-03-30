"""Persistence access for timesheet report queries (SQLAlchemy Core)."""

from datetime import date, datetime, time
from decimal import Decimal
from typing import Any

from sqlalchemy import Select, and_, func, select
from sqlalchemy.engine import RowMapping
from sqlalchemy.orm import Session

from app.models.timesheet_entry import timesheet_entries


def _row_to_dict(row: RowMapping) -> dict[str, Any]:
    return {
        "owner_name": row.get("OwnerName"),
        "feature_name": row.get("FeatureName"),
        "page_name": row.get("PageName"),
        "task_type": row.get("TaskType"),
        "subtask": row.get("Subtask"),
        "description": row.get("Description"),
        "spend_efforts": row.get("SpendEfforts"),
        "created_on": row.get("CreatedOn"),
        "sprint": row.get("Sprint"),
    }


def _base_select() -> Select:
    t = timesheet_entries
    return select(
        t.c.OwnerName,
        t.c.FeatureName,
        t.c.PageName,
        t.c.TaskType,
        t.c.Subtask,
        t.c.Description,
        t.c.SpendEfforts,
        t.c.CreatedOn,
        t.c.Sprint,
    )


def build_filtered_query(
    *,
    sprint_name: str | None,
    team_name: str | None,
    owner_name: str | None,
    activity_type: str | None,
    from_date: date | None,
    to_date: date | None,
) -> Select:
    t = timesheet_entries
    stmt = _base_select()
    conditions = []

    if sprint_name:
        s = sprint_name.strip()
        if s.isdigit():
            conditions.append(t.c.Sprint == int(s))

    if team_name and team_name.strip():
        pat = f"%{team_name.strip()}%"
        conditions.append(t.c.FeatureName.like(pat))

    if owner_name and owner_name.strip():
        conditions.append(t.c.OwnerName == owner_name.strip())

    if activity_type and activity_type.strip():
        pat = f"%{activity_type.strip()}%"
        conditions.append(t.c.TaskType.like(pat))

    if from_date is not None:
        start = datetime.combine(from_date, time.min)
        conditions.append(t.c.CreatedOn >= start)

    if to_date is not None:
        end = datetime.combine(to_date, time(23, 59, 59))
        conditions.append(t.c.CreatedOn <= end)

    if conditions:
        stmt = stmt.where(and_(*conditions))

    return stmt.order_by(t.c.CreatedOn.desc(), t.c.Sprint.asc())


def fetch_entries(
    db: Session,
    *,
    sprint_name: str | None,
    team_name: str | None,
    owner_name: str | None,
    activity_type: str | None,
    from_date: date | None,
    to_date: date | None,
) -> list[dict[str, Any]]:
    stmt = build_filtered_query(
        sprint_name=sprint_name,
        team_name=team_name,
        owner_name=owner_name,
        activity_type=activity_type,
        from_date=from_date,
        to_date=to_date,
    )
    result = db.execute(stmt)
    return [_row_to_dict(row._mapping) for row in result]


def compute_aggregations(rows: list[dict[str, Any]]) -> dict[str, Any]:
    total_hours = Decimal("0")
    pages: set[str] = set()

    for r in rows:
        eff = r.get("spend_efforts")
        if eff is not None:
            total_hours += Decimal(str(eff))
        pn = r.get("page_name")
        if pn is not None and str(pn).strip():
            pages.add(str(pn).strip())

    th = float(total_hours)
    up = len(pages)
    pph = (up / th) if th > 0 else None

    return {
        "total_hours": th,
        "unique_page_names": up,
        "entries_count": len(rows),
        "pages_per_hour": pph,
    }
