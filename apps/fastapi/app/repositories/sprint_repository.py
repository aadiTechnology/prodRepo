"""Persistence access for dbo.PT_Sprints and sprint assignment mappings (project-scoped)."""

from datetime import date, datetime
from typing import Any

from sqlalchemy import and_, delete, func, insert, select, update
from sqlalchemy.engine import RowMapping
from sqlalchemy.orm import Session

from app.models.pt_timesheet import pt_features, pt_project_users, pt_pages, pt_sprint_page_users, pt_sprints
from app.models.user import User


def _row_to_dict(row: RowMapping) -> dict[str, Any]:
    ic = row.get("IsCompleted")
    return {
        "sprint_id": int(row.get("SprintId")),
        "sprint_name": row.get("SprintName"),
        "start_date": row.get("StartDate"),
        "end_date": row.get("EndDate"),
        "is_active": bool(row.get("IsActive")) if row.get("IsActive") is not None else None,
        "is_completed": bool(ic) if ic is not None else False,
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
            pt_sprints.c.IsCompleted,
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
            pt_sprints.c.IsCompleted,
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
    is_completed: bool | None,
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
    if is_completed is not None:
        values["IsCompleted"] = 1 if is_completed else 0

    stmt = (
        insert(pt_sprints)
        .values(**values)
        .returning(
            pt_sprints.c.SprintId,
            pt_sprints.c.SprintName,
            pt_sprints.c.StartDate,
            pt_sprints.c.EndDate,
            pt_sprints.c.IsActive,
            pt_sprints.c.IsCompleted,
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
    if "is_completed" in patch:
        v = patch["is_completed"]
        mapped["IsCompleted"] = None if v is None else (1 if bool(v) else 0)

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
            pt_sprints.c.IsCompleted,
            pt_sprints.c.CreatedOn,
            pt_sprints.c.ProjectId,
        )
    )
    row = db.execute(stmt).first()
    return _row_to_dict(row._mapping) if row else None


def deactivate_other_active_sprints(db: Session, *, project_id: int, exclude_sprint_id: int) -> None:
    """Set IsActive = 0 for all other sprints in the project that are currently active."""
    db.execute(
        update(pt_sprints)
        .where(
            and_(
                pt_sprints.c.ProjectId == project_id,
                pt_sprints.c.SprintId != exclude_sprint_id,
                pt_sprints.c.IsActive == 1,
            )
        )
        .values(IsActive=0)
    )


def sprint_date_range_overlaps_existing(
    db: Session,
    *,
    project_id: int,
    exclude_sprint_id: int | None,
    start: date,
    end: date,
) -> bool:
    """
    True if another sprint in the same project has both dates set and overlaps [start, end] inclusively.
    """
    cond = [
        pt_sprints.c.ProjectId == project_id,
        pt_sprints.c.StartDate.is_not(None),
        pt_sprints.c.EndDate.is_not(None),
        pt_sprints.c.StartDate <= end,
        pt_sprints.c.EndDate >= start,
    ]
    if exclude_sprint_id is not None:
        cond.append(pt_sprints.c.SprintId != exclude_sprint_id)

    row = db.execute(select(func.count()).select_from(pt_sprints).where(and_(*cond))).scalar_one()
    return int(row or 0) > 0


def delete_sprint(db: Session, *, project_id: int, sprint_id: int) -> bool:
    res = db.execute(
        delete(pt_sprints).where(and_(pt_sprints.c.ProjectId == project_id, pt_sprints.c.SprintId == sprint_id))
    )
    return (res.rowcount or 0) > 0


# --- options for sprint assignment UI ---
def list_project_features(db: Session, *, project_id: int) -> list[dict[str, Any]]:
    rows = db.execute(
        select(pt_features.c.FeatureId, pt_features.c.FeatureName)
        .where(pt_features.c.ProjectId == project_id)
        .order_by(func.lower(pt_features.c.FeatureName).asc(), pt_features.c.FeatureId.asc())
    ).all()
    return [{"id": int(r[0]), "label": (r[1] or f"Feature {r[0]}")} for r in rows]


def list_feature_pages(db: Session, *, project_id: int, feature_id: int) -> list[dict[str, Any]]:
    rows = db.execute(
        select(pt_pages.c.PageId, pt_pages.c.PageName)
        .where(and_(pt_pages.c.ProjectId == project_id, pt_pages.c.FeatureId == feature_id))
        .order_by(func.lower(pt_pages.c.PageName).asc(), pt_pages.c.PageId.asc())
    ).all()
    return [{"id": int(r[0]), "label": (r[1] or f"Page {r[0]}")} for r in rows]


def list_project_users(db: Session, *, project_id: int) -> list[dict[str, Any]]:
    """
    Return project users from dbo.PT_ProjectUsers joined to app users.
    """
    rows = db.execute(
        select(pt_project_users.c.UserId, User.full_name)
        .select_from(pt_project_users.join(User, User.id == pt_project_users.c.UserId))
        .where(pt_project_users.c.ProjectId == project_id)
        .order_by(func.lower(User.full_name).asc(), pt_project_users.c.UserId.asc())
    ).all()
    return [{"id": int(r[0]), "label": (r[1] or f"User {r[0]}")} for r in rows]


def resolve_project_feature_ids(db: Session, *, project_id: int, feature_ids: list[int]) -> set[int]:
    if not feature_ids:
        return set()
    rows = db.execute(
        select(pt_features.c.FeatureId)
        .where(and_(pt_features.c.ProjectId == project_id, pt_features.c.FeatureId.in_(feature_ids)))
    ).all()
    return {int(r[0]) for r in rows}


def resolve_project_pages(db: Session, *, project_id: int, page_ids: list[int]) -> dict[int, dict[str, Any]]:
    if not page_ids:
        return {}
    rows = db.execute(
        select(pt_pages.c.PageId, pt_pages.c.FeatureId, pt_pages.c.ProjectId)
        .where(and_(pt_pages.c.ProjectId == project_id, pt_pages.c.PageId.in_(page_ids)))
    ).all()
    return {int(r[0]): {"page_id": int(r[0]), "feature_id": int(r[1]), "project_id": int(r[2])} for r in rows}


def resolve_project_user_ids(db: Session, *, project_id: int, user_ids: list[int]) -> set[int]:
    if not user_ids:
        return set()
    rows = db.execute(
        select(pt_project_users.c.UserId)
        .where(pt_project_users.c.ProjectId == project_id)
        .where(pt_project_users.c.UserId.in_(user_ids))
    ).all()
    return {int(r[0]) for r in rows if r[0] is not None}


# --- sprint assignment persistence (save only final Feature-Page-User) ---
def clear_sprint_page_users(db: Session, *, project_id: int, sprint_id: int) -> None:
    db.execute(
        delete(pt_sprint_page_users).where(
            and_(pt_sprint_page_users.c.ProjectId == project_id, pt_sprint_page_users.c.SprintId == sprint_id)
        )
    )


def replace_sprint_page_users(
    db: Session,
    *,
    project_id: int,
    sprint_id: int,
    page_users: list[tuple[int, int, int]],  # (feature_id, page_id, user_id)
) -> None:
    clear_sprint_page_users(db, project_id=project_id, sprint_id=sprint_id)
    if not page_users:
        return
    db.execute(
        insert(pt_sprint_page_users),
        [
            {
                "SprintId": sprint_id,
                "FeatureId": fid,
                "PageId": pid,
                "UserId": uid,
                "ProjectId": project_id,
            }
            for (fid, pid, uid) in page_users
        ],
    )


def delete_sprint_page_assignments(
    db: Session,
    *,
    project_id: int,
    sprint_id: int,
    feature_id: int,
    page_id: int,
) -> None:
    db.execute(
        delete(pt_sprint_page_users).where(
            and_(
                pt_sprint_page_users.c.ProjectId == project_id,
                pt_sprint_page_users.c.SprintId == sprint_id,
                pt_sprint_page_users.c.FeatureId == feature_id,
                pt_sprint_page_users.c.PageId == page_id,
            )
        )
    )


def fetch_sprint_assignments(db: Session, *, project_id: int, sprint_id: int) -> list[dict[str, Any]]:
    """
    Return assignment hierarchy (Feature -> Page -> Users) for a sprint.
    Single query, then assembled in Python (avoids N+1).
    """
    su = pt_sprint_page_users
    f = pt_features
    p = pt_pages
    u = User

    rows = db.execute(
        select(
            su.c.FeatureId.label("feature_id"),
            f.c.FeatureName.label("feature_name"),
            su.c.PageId.label("page_id"),
            p.c.PageName.label("page_name"),
            su.c.UserId.label("user_id"),
            u.full_name.label("user_name"),
        )
        .select_from(
            su.join(f, f.c.FeatureId == su.c.FeatureId)
            .join(p, p.c.PageId == su.c.PageId)
            .join(u, u.id == su.c.UserId)
        )
        .where(and_(su.c.ProjectId == project_id, su.c.SprintId == sprint_id))
        .order_by(
            func.lower(f.c.FeatureName).asc(),
            su.c.FeatureId.asc(),
            func.lower(p.c.PageName).asc(),
            su.c.PageId.asc(),
            func.lower(u.full_name).asc(),
            su.c.UserId.asc(),
        )
    ).all()

    # Assemble hierarchy.
    by_feature: dict[int, dict[str, Any]] = {}
    for r in rows:
        fid = int(r.feature_id)
        fnode = by_feature.get(fid)
        if fnode is None:
            fnode = {"feature_id": fid, "feature_name": r.feature_name, "pages": []}
            by_feature[fid] = fnode

        pid = int(r.page_id)
        pages = fnode["pages"]
        pnode = next((x for x in pages if x["page_id"] == pid), None)
        if pnode is None:
            pnode = {"page_id": pid, "page_name": r.page_name, "assigned_users": []}
            pages.append(pnode)

        if r.user_id is None:
            continue
        uid = int(r.user_id)
        # avoid duplicates
        if not any(x["user_id"] == uid for x in pnode["assigned_users"]):
            pnode["assigned_users"].append({"user_id": uid, "user_name": r.user_name})

    return list(by_feature.values())


def fetch_sprint_assignments_bulk(
    db: Session, *, project_id: int, sprint_ids: list[int]
) -> dict[int, list[dict[str, Any]]]:
    """Bulk variant of fetch_sprint_assignments for list pages."""
    if not sprint_ids:
        return {}

    su = pt_sprint_page_users
    f = pt_features
    p = pt_pages
    u = User

    rows = db.execute(
        select(
            su.c.SprintId.label("sprint_id"),
            su.c.FeatureId.label("feature_id"),
            f.c.FeatureName.label("feature_name"),
            su.c.PageId.label("page_id"),
            p.c.PageName.label("page_name"),
            su.c.UserId.label("user_id"),
            u.full_name.label("user_name"),
        )
        .select_from(
            su.join(f, f.c.FeatureId == su.c.FeatureId)
            .join(p, p.c.PageId == su.c.PageId)
            .join(u, u.id == su.c.UserId)
        )
        .where(and_(su.c.ProjectId == project_id, su.c.SprintId.in_(sprint_ids)))
        .order_by(
            su.c.SprintId.asc(),
            func.lower(f.c.FeatureName).asc(),
            su.c.FeatureId.asc(),
            func.lower(p.c.PageName).asc(),
            su.c.PageId.asc(),
            func.lower(u.full_name).asc(),
            su.c.UserId.asc(),
        )
    ).all()

    out: dict[int, dict[int, dict[str, Any]]] = {}
    for r in rows:
        sid = int(r.sprint_id)
        fid = int(r.feature_id)
        fnode = out.setdefault(sid, {}).get(fid)
        if fnode is None:
            fnode = {"feature_id": fid, "feature_name": r.feature_name, "pages": []}
            out[sid][fid] = fnode

        if r.page_id is None:
            continue
        pid = int(r.page_id)
        pages = fnode["pages"]
        pnode = next((x for x in pages if x["page_id"] == pid), None)
        if pnode is None:
            pnode = {"page_id": pid, "page_name": r.page_name, "assigned_users": []}
            pages.append(pnode)

        if r.user_id is None:
            continue
        uid = int(r.user_id)
        if not any(x["user_id"] == uid for x in pnode["assigned_users"]):
            pnode["assigned_users"].append({"user_id": uid, "user_name": r.user_name})

    return {sid: list(fmap.values()) for sid, fmap in out.items()}

