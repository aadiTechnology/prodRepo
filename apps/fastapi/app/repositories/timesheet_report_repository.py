"""Persistence access for sprint performance report queries (SQLAlchemy Core).

Uses normalized PT_* master tables (see Product/document SQL scripts).
All report data is scoped by PT_Features.ProjectId (and tenant enforced in the service layer).
"""

from datetime import date, datetime, time
from decimal import Decimal
from typing import Any

from sqlalchemy import Select, and_, exists, func, or_, select
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
    pt_task_type,
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
            pt_task_type.c.TaskName,
            pt_subtasks.c.SubtaskName,
            ts.c.Description,
            ts.c.Efforts,
            ts.c.ActivityDate,
            ts.c.SprintId,
        ).select_from(
            ts.join(pt_owners, pt_owners.c.OwnerId == ts.c.OwnerId)
            .join(pt_features, pt_features.c.FeatureId == ts.c.FeatureId)
            .join(pt_pages, pt_pages.c.PageId == ts.c.PageId)
            .join(pt_task_type, pt_task_type.c.TaskId == ts.c.TaskId)
            .join(pt_subtasks, pt_subtasks.c.SubtaskId == ts.c.SubtaskId)
            .join(pt_sprints, pt_sprints.c.SprintId == ts.c.SprintId)
        )
    )


def build_filtered_query(
    *,
    project_id: int,
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
    conditions = [pt_features.c.ProjectId == project_id]

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
        conditions.append(pt_task_type.c.TaskName.like(pat))

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

    stmt = stmt.where(and_(*conditions))

    return stmt.order_by(ts.c.ActivityDate.desc(), ts.c.SprintId.asc())


def fetch_entries(
    db: Session,
    *,
    project_id: int,
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
        project_id=project_id,
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


def fetch_filter_options(db: Session, project_id: int) -> dict[str, Any]:
    ts = pt_timesheets
    feat = pt_features
    tt = pt_task_type

    owner_rows = db.execute(
        select(pt_owners.c.OwnerId, pt_owners.c.OwnerName)
        .select_from(ts.join(feat, feat.c.FeatureId == ts.c.FeatureId).join(pt_owners, pt_owners.c.OwnerId == ts.c.OwnerId))
        .where(feat.c.ProjectId == project_id)
        .distinct()
        .order_by(pt_owners.c.OwnerName.asc())
    ).all()

    features = db.execute(
        select(pt_features.c.FeatureId, pt_features.c.FeatureName)
        .where(pt_features.c.ProjectId == project_id)
        .order_by(pt_features.c.FeatureName.asc())
    ).all()

    used_task_subq = (
        select(ts.c.TaskId)
        .select_from(ts.join(feat, feat.c.FeatureId == ts.c.FeatureId))
        .where(feat.c.ProjectId == project_id)
        .distinct()
    )
    tasks = db.execute(
        select(tt.c.TaskId, tt.c.TaskName)
        .where(or_(tt.c.ProjectId == project_id, tt.c.TaskId.in_(used_task_subq)))
        .order_by(tt.c.TaskName.asc())
    ).all()

    sprints = db.execute(
        select(pt_sprints.c.SprintId, pt_sprints.c.SprintName)
        .where(pt_sprints.c.ProjectId == project_id)
        .order_by(pt_sprints.c.SprintId.asc())
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
        rows = db.execute(select(m.c.TaskId, m.c.CategoryId).where(m.c.TaskId.in_(task_ids))).all()
        for tid, cid in rows:
            cats_by_task[tid].append(cid)

    return {
        "owners": [{"id": r[0], "label": r[1]} for r in owner_rows],
        "features": [{"id": r[0], "label": r[1]} for r in features],
        "categories": [{"id": r[0], "label": r[1] or f"Category {r[0]}"} for r in categories],
        "tasks": [
            {"id": r[0], "label": r[1], "category_ids": cats_by_task.get(r[0], [])} for r in tasks
        ],
        "sprints": [{"id": r[0], "label": r[1] or f"Sprint {r[0]}"} for r in sprints],
    }


def resolve_task_category_id_by_name(db: Session, category_name: str) -> int | None:
    """Match PT_TaskCategories.CategoryName case-insensitively."""
    if not category_name or not category_name.strip():
        return None
    key = category_name.strip().lower()
    row = db.execute(
        select(pt_task_categories.c.CategoryId).where(func.lower(pt_task_categories.c.CategoryName) == key)
    ).first()
    return int(row[0]) if row else None


def _timesheets_join_features():
    ts = pt_timesheets
    return ts.join(pt_features, pt_features.c.FeatureId == ts.c.FeatureId)


def fetch_sprintwise_efforts_for_category(
    db: Session,
    *,
    project_id: int,
    category_id: int,
    owner_ids: list[int] | None,
    sprint_ids: list[int] | None = None,
) -> dict[int, Decimal]:
    """Sum normalized timesheet efforts per sprint for tasks mapped to the given category."""
    ts = pt_timesheets
    m = pt_task_category_mapping
    cat_match = exists().where(and_(m.c.TaskId == ts.c.TaskId, m.c.CategoryId == category_id))
    stmt = (
        select(ts.c.SprintId, func.sum(ts.c.Efforts))
        .select_from(_timesheets_join_features())
        .where(pt_features.c.ProjectId == project_id)
        .where(cat_match)
        .group_by(ts.c.SprintId)
    )
    if owner_ids:
        stmt = stmt.where(ts.c.OwnerId.in_(owner_ids))
    if sprint_ids:
        stmt = stmt.where(ts.c.SprintId.in_(sprint_ids))
    result: dict[int, Decimal] = {}
    for row in db.execute(stmt):
        sid, total = row[0], row[1]
        if sid is None:
            continue
        result[int(sid)] = Decimal(str(total)) if total is not None else Decimal("0")
    return result


def fetch_sprintwise_total_efforts(
    db: Session,
    *,
    project_id: int,
    owner_ids: list[int] | None,
    sprint_ids: list[int] | None = None,
) -> dict[int, Decimal]:
    """Sum all dbo.PT_Timesheets.Efforts per sprint (no task-category / mapping filter)."""
    ts = pt_timesheets
    per_row_effort = func.coalesce(ts.c.Efforts, 0)
    effort_total = func.coalesce(func.sum(per_row_effort), 0).label("effort_total")
    stmt = (
        select(ts.c.SprintId, effort_total)
        .select_from(_timesheets_join_features())
        .where(pt_features.c.ProjectId == project_id)
        .group_by(ts.c.SprintId)
    )
    if owner_ids:
        stmt = stmt.where(ts.c.OwnerId.in_(owner_ids))
    if sprint_ids:
        stmt = stmt.where(ts.c.SprintId.in_(sprint_ids))
    result: dict[int, Decimal] = {}
    for row in db.execute(stmt):
        sid, total = row[0], row[1]
        if sid is None:
            continue
        result[int(sid)] = Decimal(str(total)) if total is not None else Decimal("0")
    return result


def fetch_sprint_ids_ordered(db: Session, project_id: int) -> list[int]:
    rows = (
        db.execute(
            select(pt_sprints.c.SprintId)
            .where(pt_sprints.c.ProjectId == project_id)
            .order_by(pt_sprints.c.SprintId.asc())
        ).all()
    )
    return [int(r[0]) for r in rows]


def _fetch_category_sums_by_owner_sprint(
    db: Session,
    *,
    project_id: int,
    category_id: int,
    owner_ids: list[int] | None,
    sprint_ids: list[int] | None,
) -> dict[tuple[int, int], Decimal]:
    ts = pt_timesheets
    m = pt_task_category_mapping
    cat_match = exists().where(and_(m.c.TaskId == ts.c.TaskId, m.c.CategoryId == category_id))
    per_row = func.coalesce(ts.c.Efforts, 0)
    stmt = (
        select(ts.c.OwnerId, ts.c.SprintId, func.coalesce(func.sum(per_row), 0))
        .select_from(_timesheets_join_features())
        .where(pt_features.c.ProjectId == project_id)
        .where(cat_match)
        .where(ts.c.OwnerId.isnot(None))
        .group_by(ts.c.OwnerId, ts.c.SprintId)
    )
    if owner_ids:
        stmt = stmt.where(ts.c.OwnerId.in_(owner_ids))
    if sprint_ids:
        stmt = stmt.where(ts.c.SprintId.in_(sprint_ids))
    out: dict[tuple[int, int], Decimal] = {}
    for row in db.execute(stmt):
        oid, sid, val = int(row[0]), int(row[1]), row[2]
        out[(oid, sid)] = Decimal(str(val)) if val is not None else Decimal("0")
    return out


def _fetch_total_sums_by_owner_sprint(
    db: Session,
    *,
    project_id: int,
    owner_ids: list[int] | None,
    sprint_ids: list[int] | None,
) -> dict[tuple[int, int], Decimal]:
    ts = pt_timesheets
    per_row = func.coalesce(ts.c.Efforts, 0)
    stmt = (
        select(ts.c.OwnerId, ts.c.SprintId, func.coalesce(func.sum(per_row), 0))
        .select_from(_timesheets_join_features())
        .where(pt_features.c.ProjectId == project_id)
        .where(ts.c.OwnerId.isnot(None))
        .group_by(ts.c.OwnerId, ts.c.SprintId)
    )
    if owner_ids:
        stmt = stmt.where(ts.c.OwnerId.in_(owner_ids))
    if sprint_ids:
        stmt = stmt.where(ts.c.SprintId.in_(sprint_ids))
    out: dict[tuple[int, int], Decimal] = {}
    for row in db.execute(stmt):
        oid, sid, val = int(row[0]), int(row[1]), row[2]
        out[(oid, sid)] = Decimal(str(val)) if val is not None else Decimal("0")
    return out


def fetch_member_sprint_metric_pairs(
    db: Session,
    *,
    project_id: int,
    owner_ids: list[int] | None,
    sprint_ids: list[int] | None,
    billable_category_id: int | None,
    productive_category_id: int | None,
) -> dict[tuple[int, int], tuple[Decimal, Decimal, Decimal]]:
    """(OwnerId, SprintId) -> billable, productive (PageDevelopment), uncategorized total."""
    bill: dict[tuple[int, int], Decimal] = {}
    prod: dict[tuple[int, int], Decimal] = {}
    if billable_category_id is not None:
        bill = _fetch_category_sums_by_owner_sprint(
            db,
            project_id=project_id,
            category_id=billable_category_id,
            owner_ids=owner_ids,
            sprint_ids=sprint_ids,
        )
    if productive_category_id is not None:
        prod = _fetch_category_sums_by_owner_sprint(
            db,
            project_id=project_id,
            category_id=productive_category_id,
            owner_ids=owner_ids,
            sprint_ids=sprint_ids,
        )
    tot = _fetch_total_sums_by_owner_sprint(db, project_id=project_id, owner_ids=owner_ids, sprint_ids=sprint_ids)
    keys = set(bill.keys()) | set(prod.keys()) | set(tot.keys())
    merged: dict[tuple[int, int], tuple[Decimal, Decimal, Decimal]] = {}
    for k in keys:
        merged[k] = (
            bill.get(k, Decimal("0")),
            prod.get(k, Decimal("0")),
            tot.get(k, Decimal("0")),
        )
    return merged


def fetch_sprint_labels(db: Session, sprint_ids: list[int]) -> dict[int, str]:
    if not sprint_ids:
        return {}
    rows = db.execute(
        select(pt_sprints.c.SprintId, pt_sprints.c.SprintName).where(pt_sprints.c.SprintId.in_(sprint_ids))
    ).all()
    return {int(r[0]): (str(r[1]).strip() if r[1] else f"Sprint {r[0]}") for r in rows}


def fetch_owner_labels(db: Session, owner_ids: list[int]) -> dict[int, str]:
    if not owner_ids:
        return {}
    rows = db.execute(
        select(pt_owners.c.OwnerId, pt_owners.c.OwnerName).where(pt_owners.c.OwnerId.in_(owner_ids))
    ).all()
    return {int(r[0]): (str(r[1]).strip() if r[1] else f"Owner {r[0]}") for r in rows}


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
