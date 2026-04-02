"""Persistence access for sprint performance report queries (SQLAlchemy Core).

Uses normalized PT_* master tables (see Product/document SQL scripts).
"""

from datetime import date, datetime, time
from decimal import Decimal
from typing import Any

from sqlalchemy import Select, and_, exists, select
from sqlalchemy.engine import RowMapping
from sqlalchemy.orm import Session

from app.models.pt_timesheet import (
    pt_features,
    pt_owners,
    pt_pages,
    pt_sprints,
    pt_subtasks,
    pt_task_categories,
    pt_task_category_mapping,
    pt_tasks,
    pt_timesheets,
)


def _row_to_dict(row: RowMapping) -> dict[str, Any]:
    return {
        "owner_name": row.get("OwnerName"),
        "feature_name": row.get("FeatureName"),
        "page_name": row.get("PageName"),
        "task_type": row.get("TaskName"),
        "subtask": row.get("SubtaskName"),
        "description": row.get("Description"),
        "spend_efforts": row.get("Efforts"),
        "created_on": row.get("ActivityDate"),
        "sprint": row.get("SprintId"),
    }


def _base_select() -> Select:
    ts = pt_timesheets
    return (
        select(
            pt_owners.c.OwnerName,
            pt_features.c.FeatureName,
            pt_pages.c.PageName,
            pt_tasks.c.TaskName,
            pt_subtasks.c.SubtaskName,
            ts.c.Description,
            ts.c.Efforts,
            ts.c.ActivityDate,
            ts.c.SprintId,
        ).select_from(
            ts.join(pt_owners, pt_owners.c.OwnerId == ts.c.OwnerId)
            .join(pt_features, pt_features.c.FeatureId == ts.c.FeatureId)
            .join(pt_pages, pt_pages.c.PageId == ts.c.PageId)
            .join(pt_tasks, pt_tasks.c.TaskId == ts.c.TaskId)
            .join(pt_subtasks, pt_subtasks.c.SubtaskId == ts.c.SubtaskId)
            .join(pt_sprints, pt_sprints.c.SprintId == ts.c.SprintId)
        )
    )


def build_filtered_query(
    *,
    sprint_id: int | None = None,
    feature_id: int | None = None,
    owner_id: int | None = None,
    task_id: int | None = None,
    category_ids: list[int] | None = None,
    # Legacy / fallback filters (kept for backward compatibility)
    sprint_name: str | None,
    team_name: str | None,
    owner_name: str | None,
    activity_type: str | None,
    from_date: date | None,
    to_date: date | None,
) -> Select:
    stmt = _base_select()
    conditions = []

    ts = pt_timesheets

    if sprint_id is not None:
        conditions.append(ts.c.SprintId == sprint_id)
    elif sprint_name:
        s = sprint_name.strip()
        if s.isdigit():
            conditions.append(ts.c.SprintId == int(s))

    if feature_id is not None:
        conditions.append(ts.c.FeatureId == feature_id)
    elif team_name and team_name.strip():
        pat = f"%{team_name.strip()}%"
        conditions.append(pt_features.c.FeatureName.like(pat))

    if owner_id is not None:
        conditions.append(ts.c.OwnerId == owner_id)
    elif owner_name and owner_name.strip():
        conditions.append(pt_owners.c.OwnerName == owner_name.strip())

    if task_id is not None:
        conditions.append(ts.c.TaskId == task_id)
    elif activity_type and activity_type.strip():
        pat = f"%{activity_type.strip()}%"
        conditions.append(pt_tasks.c.TaskName.like(pat))

    if category_ids:
        m = pt_task_category_mapping
        conditions.append(
            exists().where(and_(m.c.TaskId == ts.c.TaskId, m.c.CategoryId.in_(category_ids)))
        )

    if from_date is not None:
        start = datetime.combine(from_date, time.min)
        conditions.append(ts.c.ActivityDate >= start)

    if to_date is not None:
        end = datetime.combine(to_date, time(23, 59, 59))
        conditions.append(ts.c.ActivityDate <= end)

    if conditions:
        stmt = stmt.where(and_(*conditions))

    return stmt.order_by(ts.c.ActivityDate.desc(), ts.c.SprintId.asc())


def fetch_entries(
    db: Session,
    *,
    sprint_id: int | None = None,
    feature_id: int | None = None,
    owner_id: int | None = None,
    task_id: int | None = None,
    category_ids: list[int] | None = None,
    sprint_name: str | None,
    team_name: str | None,
    owner_name: str | None,
    activity_type: str | None,
    from_date: date | None,
    to_date: date | None,
) -> list[dict[str, Any]]:
    stmt = build_filtered_query(
        sprint_id=sprint_id,
        feature_id=feature_id,
        owner_id=owner_id,
        task_id=task_id,
        category_ids=category_ids,
        sprint_name=sprint_name,
        team_name=team_name,
        owner_name=owner_name,
        activity_type=activity_type,
        from_date=from_date,
        to_date=to_date,
    )
    result = db.execute(stmt)
    return [_row_to_dict(row._mapping) for row in result]


def fetch_filter_options(db: Session) -> dict[str, Any]:
    owners = db.execute(
        select(pt_owners.c.OwnerId, pt_owners.c.OwnerName).order_by(pt_owners.c.OwnerName.asc())
    ).all()
    features = db.execute(
        select(pt_features.c.FeatureId, pt_features.c.FeatureName).order_by(pt_features.c.FeatureName.asc())
    ).all()
    tasks = db.execute(select(pt_tasks.c.TaskId, pt_tasks.c.TaskName).order_by(pt_tasks.c.TaskName.asc())).all()
    sprints = db.execute(
        select(pt_sprints.c.SprintId, pt_sprints.c.SprintName).order_by(pt_sprints.c.SprintId.asc())
    ).all()

    categories = db.execute(
        select(pt_task_categories.c.CategoryId, pt_task_categories.c.CategoryName).order_by(
            pt_task_categories.c.CategoryName.asc()
        )
    ).all()

    task_ids = [r[0] for r in tasks]
    cats_by_task: dict[int, list[int]] = {tid: [] for tid in task_ids}
    if task_ids:
        m = pt_task_category_mapping
        rows = db.execute(
            select(m.c.TaskId, m.c.CategoryId).where(m.c.TaskId.in_(task_ids))
        ).all()
        for tid, cid in rows:
            cats_by_task[tid].append(cid)

    return {
        "owners": [{"id": r[0], "label": r[1]} for r in owners],
        "features": [{"id": r[0], "label": r[1]} for r in features],
        "categories": [{"id": r[0], "label": r[1] or f"Category {r[0]}"} for r in categories],
        "tasks": [
            {"id": r[0], "label": r[1], "category_ids": cats_by_task.get(r[0], [])} for r in tasks
        ],
        "sprints": [{"id": r[0], "label": r[1] or f"Sprint {r[0]}"} for r in sprints],
    }


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
