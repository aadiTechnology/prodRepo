"""Persistence access for dbo.PT_Sprints (project-scoped)."""

from datetime import datetime
from typing import Any

from sqlalchemy import and_, func, insert, select, update, delete
from sqlalchemy.engine import RowMapping
from sqlalchemy.orm import Session

from app.models.pt_timesheet import pt_sprints


def _row_to_dict(row: RowMapping) -> dict[str, Any]:
    return {
        "sprint_id": int(row.get("SprintId")),
        "sprint_name": row.get("SprintName"),
        "start_date": row.get("StartDate"),
        "end_date": row.get("EndDate"),
        "is_active": bool(row.get("IsActive")) if row.get("IsActive") is not None else None,
        "created_on": row.get("CreatedOn"),
        "project_id": int(row.get("ProjectId")) if row.get("ProjectId") is not None else None,
    }


def list_sprints(
    db: Session,
    *,
    project_id: int,
    search: str | None,
    page: int,
    page_size: int,
) -> tuple[list[dict[str, Any]], int]:
    cond = [pt_sprints.c.ProjectId == project_id]
    if search and search.strip():
        cond.append(pt_sprints.c.SprintName.ilike(f"%{search.strip()}%"))

    total = db.execute(select(func.count()).select_from(pt_sprints).where(and_(*cond))).scalar_one()

    rows = db.execute(
        select(
            pt_sprints.c.SprintId,
            pt_sprints.c.SprintName,
            pt_sprints.c.StartDate,
            pt_sprints.c.EndDate,
            pt_sprints.c.IsActive,
            pt_sprints.c.CreatedOn,
            pt_sprints.c.ProjectId,
        )
        .where(and_(*cond))
        .order_by(pt_sprints.c.SprintId.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    items = [_row_to_dict(r._mapping) for r in rows]
    return items, int(total)


def get_sprint(db: Session, *, project_id: int, sprint_id: int) -> dict[str, Any] | None:
    row = db.execute(
        select(
            pt_sprints.c.SprintId,
            pt_sprints.c.SprintName,
            pt_sprints.c.StartDate,
            pt_sprints.c.EndDate,
            pt_sprints.c.IsActive,
            pt_sprints.c.CreatedOn,
            pt_sprints.c.ProjectId,
        )
        .where(and_(pt_sprints.c.ProjectId == project_id, pt_sprints.c.SprintId == sprint_id))
    ).first()
    return _row_to_dict(row._mapping) if row else None


def create_sprint(
    db: Session,
    *,
    project_id: int,
    sprint_name: str,
    start_date,
    end_date,
    is_active: bool | None,
) -> dict[str, Any]:
    values: dict[str, Any] = {
        "SprintName": sprint_name,
        "StartDate": start_date,
        "EndDate": end_date,
        "ProjectId": project_id,
        "CreatedOn": datetime.utcnow(),
    }
    if is_active is not None:
        values["IsActive"] = 1 if is_active else 0

    stmt = (
        insert(pt_sprints)
        .values(**values)
        .returning(
            pt_sprints.c.SprintId,
            pt_sprints.c.SprintName,
            pt_sprints.c.StartDate,
            pt_sprints.c.EndDate,
            pt_sprints.c.IsActive,
            pt_sprints.c.CreatedOn,
            pt_sprints.c.ProjectId,
        )
    )
    row = db.execute(stmt).first()
    return _row_to_dict(row._mapping)


def update_sprint(
    db: Session,
    *,
    project_id: int,
    sprint_id: int,
    patch: dict[str, Any],
) -> dict[str, Any] | None:
    if not patch:
        return get_sprint(db, project_id=project_id, sprint_id=sprint_id)

    mapped: dict[str, Any] = {}
    if "sprint_name" in patch:
        mapped["SprintName"] = patch["sprint_name"]
    if "start_date" in patch:
        mapped["StartDate"] = patch["start_date"]
    if "end_date" in patch:
        mapped["EndDate"] = patch["end_date"]
    if "is_active" in patch:
        v = patch["is_active"]
        mapped["IsActive"] = None if v is None else (1 if bool(v) else 0)

    if not mapped:
        return get_sprint(db, project_id=project_id, sprint_id=sprint_id)

    stmt = (
        update(pt_sprints)
        .where(and_(pt_sprints.c.ProjectId == project_id, pt_sprints.c.SprintId == sprint_id))
        .values(**mapped)
        .returning(
            pt_sprints.c.SprintId,
            pt_sprints.c.SprintName,
            pt_sprints.c.StartDate,
            pt_sprints.c.EndDate,
            pt_sprints.c.IsActive,
            pt_sprints.c.CreatedOn,
            pt_sprints.c.ProjectId,
        )
    )
    row = db.execute(stmt).first()
    return _row_to_dict(row._mapping) if row else None


def delete_sprint(db: Session, *, project_id: int, sprint_id: int) -> bool:
    res = db.execute(
        delete(pt_sprints).where(and_(pt_sprints.c.ProjectId == project_id, pt_sprints.c.SprintId == sprint_id))
    )
    return (res.rowcount or 0) > 0

