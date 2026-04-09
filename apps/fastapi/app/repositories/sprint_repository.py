"""Persistence access for dbo.PT_Sprints and sprint assignment mappings (project-scoped)."""

from datetime import date, datetime
from typing import Any

from sqlalchemy import and_, delete, func, insert, select, update
from sqlalchemy.engine import RowMapping
from sqlalchemy.orm import Session

from app.models.pt_timesheet import pt_features, pt_project_users, pt_pages, pt_sprint_page_users, pt_sprints
from app.models.user import User

ROLE_DEVELOPER = 1
ROLE_TESTER = 2


def _effective_role(raw: Any) -> int:
    if raw is None:
        return ROLE_DEVELOPER
    return int(raw)


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


# --- sprint assignment persistence (Feature-Page-User with Developer/Tester roles) ---
def clear_sprint_page_users(db: Session, *, project_id: int, sprint_id: int) -> None:
    db.execute(
        delete(pt_sprint_page_users).where(
            and_(pt_sprint_page_users.c.ProjectId == project_id, pt_sprint_page_users.c.SprintId == sprint_id)
        )
    )


def clear_sprint_page_users_for_feature(
    db: Session, *, project_id: int, sprint_id: int, feature_id: int
) -> None:
    db.execute(
        delete(pt_sprint_page_users).where(
            and_(
                pt_sprint_page_users.c.ProjectId == project_id,
                pt_sprint_page_users.c.SprintId == sprint_id,
                pt_sprint_page_users.c.FeatureId == feature_id,
            )
        )
    )


def replace_sprint_page_users(
    db: Session,
    *,
    project_id: int,
    sprint_id: int,
    rows: list[dict[str, Any]],
) -> None:
    """
    rows: dict with keys FeatureId, PageId, UserId, AssignmentRole, IsPrimary,
          UpdatedOn, UpdatedByUserId, ProjectId optional (filled from kwargs).
    """
    clear_sprint_page_users(db, project_id=project_id, sprint_id=sprint_id)
    if not rows:
        return
    payload = []
    for r in rows:
        payload.append(
            {
                "SprintId": sprint_id,
                "FeatureId": int(r["FeatureId"]),
                "PageId": int(r["PageId"]),
                "UserId": int(r["UserId"]),
                "ProjectId": project_id,
                "AssignmentRole": int(r["AssignmentRole"]),
                "IsPrimary": int(r.get("IsPrimary") or 0),
                "UpdatedOn": r.get("UpdatedOn"),
                "UpdatedByUserId": r.get("UpdatedByUserId"),
            }
        )
    db.execute(insert(pt_sprint_page_users), payload)


def replace_sprint_page_users_for_feature(
    db: Session,
    *,
    project_id: int,
    sprint_id: int,
    feature_id: int,
    rows: list[dict[str, Any]],
) -> None:
    """
    Like replace_sprint_page_users, but only replaces rows for a single feature.
    Useful for on-demand / partial saves from the assignment management UI.
    """
    clear_sprint_page_users_for_feature(db, project_id=project_id, sprint_id=sprint_id, feature_id=feature_id)
    if not rows:
        return
    payload = []
    for r in rows:
        payload.append(
            {
                "SprintId": sprint_id,
                "FeatureId": feature_id,
                "PageId": int(r["PageId"]),
                "UserId": int(r["UserId"]),
                "ProjectId": project_id,
                "AssignmentRole": int(r["AssignmentRole"]),
                "IsPrimary": int(r.get("IsPrimary") or 0),
                "UpdatedOn": r.get("UpdatedOn"),
                "UpdatedByUserId": r.get("UpdatedByUserId"),
            }
        )
    db.execute(insert(pt_sprint_page_users), payload)


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


def _sort_assigned_users(entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(entries, key=lambda x: (-bool(x.get("is_primary")), int(x["user_id"])))


def _append_role_user(
    pnode: dict[str, Any],
    *,
    role: int,
    user_id: int,
    user_name: str | None,
    is_primary: int,
) -> None:
    item = {"user_id": user_id, "user_name": user_name, "is_primary": bool(is_primary)}
    if role == ROLE_TESTER:
        key = "testers"
        other = "developers"
    else:
        key = "developers"
        other = "testers"
    if not any(x["user_id"] == user_id for x in pnode[key]):
        pnode[key].append(item)
    # backward compat flat list
    if not any(x["user_id"] == user_id for x in pnode["assigned_users"]):
        pnode["assigned_users"].append({"user_id": user_id, "user_name": user_name})


def fetch_sprint_assignments(db: Session, *, project_id: int, sprint_id: int) -> list[dict[str, Any]]:
    """
    Feature -> Page -> developers[], testers[], assigned_users (legacy union), primary_* for UI.
    """
    su = pt_sprint_page_users
    f = pt_features
    p = pt_pages
    u = User

    rows = db.execute(
        select(
            su.c.Id,
            su.c.FeatureId.label("feature_id"),
            f.c.FeatureName.label("feature_name"),
            su.c.PageId.label("page_id"),
            p.c.PageName.label("page_name"),
            su.c.UserId.label("user_id"),
            u.full_name.label("user_name"),
            su.c.AssignmentRole,
            su.c.IsPrimary,
        )
        .select_from(
            su.join(f, f.c.FeatureId == su.c.FeatureId)
            .join(p, p.c.PageId == su.c.PageId)
            .join(u, u.id == su.c.UserId)
        )
        .where(and_(su.c.ProjectId == project_id, su.c.SprintId == sprint_id))
        .order_by(
            su.c.FeatureId.asc(),
            su.c.PageId.asc(),
            su.c.AssignmentRole.asc(),
            su.c.IsPrimary.desc(),
            su.c.Id.asc(),
        )
    ).all()

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
            pnode = {
                "page_id": pid,
                "page_name": r.page_name,
                "developers": [],
                "testers": [],
                "assigned_users": [],
                "primary_developer_id": None,
                "primary_tester_id": None,
            }
            pages.append(pnode)

        role = _effective_role(getattr(r, "AssignmentRole", None))
        ip = int(r.IsPrimary or 0) if r.IsPrimary is not None else 0
        _append_role_user(
            pnode,
            role=role,
            user_id=int(r.user_id),
            user_name=r.user_name,
            is_primary=ip,
        )

    for fnode in by_feature.values():
        for pnode in fnode["pages"]:
            pnode["developers"] = _sort_assigned_users(pnode["developers"])
            pnode["testers"] = _sort_assigned_users(pnode["testers"])
            pd = next((x for x in pnode["developers"] if x.get("is_primary")), None) or (
                pnode["developers"][0] if pnode["developers"] else None
            )
            pt = next((x for x in pnode["testers"] if x.get("is_primary")), None) or (
                pnode["testers"][0] if pnode["testers"] else None
            )
            pnode["primary_developer_id"] = pd["user_id"] if pd else None
            pnode["primary_tester_id"] = pt["user_id"] if pt else None
            # strip is_primary from nested if API wants leaner — keep for management UI

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
            su.c.AssignmentRole,
            su.c.IsPrimary,
        )
        .select_from(
            su.join(f, f.c.FeatureId == su.c.FeatureId)
            .join(p, p.c.PageId == su.c.PageId)
            .join(u, u.id == su.c.UserId)
        )
        .where(and_(su.c.ProjectId == project_id, su.c.SprintId.in_(sprint_ids)))
        .order_by(
            su.c.SprintId.asc(),
            su.c.FeatureId.asc(),
            su.c.PageId.asc(),
            su.c.AssignmentRole.asc(),
            su.c.IsPrimary.desc(),
            su.c.Id.asc(),
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

        pid = int(r.page_id)
        pages = fnode["pages"]
        pnode = next((x for x in pages if x["page_id"] == pid), None)
        if pnode is None:
            pnode = {
                "page_id": pid,
                "page_name": r.page_name,
                "developers": [],
                "testers": [],
                "assigned_users": [],
                "primary_developer_id": None,
                "primary_tester_id": None,
            }
            pages.append(pnode)

        role = _effective_role(getattr(r, "AssignmentRole", None))
        ip = int(r.IsPrimary or 0) if r.IsPrimary is not None else 0
        _append_role_user(
            pnode,
            role=role,
            user_id=int(r.user_id),
            user_name=r.user_name,
            is_primary=ip,
        )

    result: dict[int, list[dict[str, Any]]] = {}
    for sid, fmap in out.items():
        for fnode in fmap.values():
            for pnode in fnode["pages"]:
                pnode["developers"] = _sort_assigned_users(pnode["developers"])
                pnode["testers"] = _sort_assigned_users(pnode["testers"])
                pd = next((x for x in pnode["developers"] if x.get("is_primary")), None) or (
                    pnode["developers"][0] if pnode["developers"] else None
                )
                pt = next((x for x in pnode["testers"] if x.get("is_primary")), None) or (
                    pnode["testers"][0] if pnode["testers"] else None
                )
                pnode["primary_developer_id"] = pd["user_id"] if pd else None
                pnode["primary_tester_id"] = pt["user_id"] if pt else None
        result[sid] = list(fmap.values())
    return result


def list_project_feature_page_catalog(db: Session, *, project_id: int) -> list[dict[str, Any]]:
    """All Feature → Page rows for a project (for assignment grid)."""
    rows = db.execute(
        select(
            pt_features.c.FeatureId,
            pt_features.c.FeatureName,
            pt_pages.c.PageId,
            pt_pages.c.PageName,
        )
        .select_from(
            pt_features.join(
                pt_pages,
                and_(pt_pages.c.FeatureId == pt_features.c.FeatureId, pt_pages.c.ProjectId == pt_features.c.ProjectId),
            )
        )
        .where(pt_features.c.ProjectId == project_id)
        .order_by(
            func.lower(pt_features.c.FeatureName).asc(),
            pt_features.c.FeatureId.asc(),
            func.lower(pt_pages.c.PageName).asc(),
            pt_pages.c.PageId.asc(),
        )
    ).all()
    return [
        {
            "feature_id": int(r[0]),
            "feature_name": r[1],
            "page_id": int(r[2]),
            "page_name": r[3],
        }
        for r in rows
    ]


def list_project_feature_page_catalog_for_feature(
    db: Session, *, project_id: int, feature_id: int
) -> list[dict[str, Any]]:
    """All Page rows for a single feature in a project (for on-demand grid)."""
    rows = db.execute(
        select(
            pt_features.c.FeatureId,
            pt_features.c.FeatureName,
            pt_pages.c.PageId,
            pt_pages.c.PageName,
        )
        .select_from(
            pt_features.join(
                pt_pages,
                and_(pt_pages.c.FeatureId == pt_features.c.FeatureId, pt_pages.c.ProjectId == pt_features.c.ProjectId),
            )
        )
        .where(and_(pt_features.c.ProjectId == project_id, pt_features.c.FeatureId == feature_id))
        .order_by(
            func.lower(pt_pages.c.PageName).asc(),
            pt_pages.c.PageId.asc(),
        )
    ).all()
    return [
        {
            "feature_id": int(r[0]),
            "feature_name": r[1],
            "page_id": int(r[2]),
            "page_name": r[3],
        }
        for r in rows
    ]


def fetch_sprint_assignment_management_grid(
    db: Session, *, project_id: int, sprint_id: int
) -> dict[str, Any]:
    """
    Full project catalog merged with sprint assignments + summary stats.
    """
    catalog = list_project_feature_page_catalog(db, project_id=project_id)
    assign_tree = fetch_sprint_assignments(db, project_id=project_id, sprint_id=sprint_id)
    by_f: dict[int, dict[str, Any]] = {f["feature_id"]: f for f in assign_tree}
    by_fp: dict[tuple[int, int], dict[str, Any]] = {}
    for f in assign_tree:
        for p in f["pages"]:
            by_fp[(f["feature_id"], p["page_id"])] = p

    features_out: list[dict[str, Any]] = []
    current_fid: int | None = None
    current_fnode: dict[str, Any] | None = None

    total_pages = 0
    assigned_pages = 0

    for row in catalog:
        fid = row["feature_id"]
        pid = row["page_id"]
        total_pages += 1
        p_saved = by_fp.get((fid, pid))
        has_assign = bool(
            p_saved
            and (
                (p_saved.get("developers") and len(p_saved["developers"]) > 0)
                or (p_saved.get("testers") and len(p_saved["testers"]) > 0)
            )
        )
        if has_assign:
            assigned_pages += 1

        pnode = {
            "page_id": pid,
            "page_name": row["page_name"],
            "developers": (p_saved or {}).get("developers") or [],
            "testers": (p_saved or {}).get("testers") or [],
            "assigned_users": (p_saved or {}).get("assigned_users") or [],
            "primary_developer_id": (p_saved or {}).get("primary_developer_id"),
            "primary_tester_id": (p_saved or {}).get("primary_tester_id"),
            "last_updated_on": None,
            "last_updated_by_user_id": None,
            "last_updated_by_name": None,
            "status": "saved" if has_assign else "unassigned",
        }
        if current_fid != fid:
            meta = by_f.get(fid)
            current_fnode = {
                "feature_id": fid,
                "feature_name": meta["feature_name"] if meta else row["feature_name"],
                "pages": [],
            }
            features_out.append(current_fnode)
            current_fid = fid
        assert current_fnode is not None
        current_fnode["pages"].append(pnode)

    # enrich last_updated per page from raw SQL aggregate
    su = pt_sprint_page_users
    uu = User
    agg = db.execute(
        select(
            su.c.FeatureId,
            su.c.PageId,
            func.max(su.c.UpdatedOn).label("mx"),
        )
        .where(and_(su.c.ProjectId == project_id, su.c.SprintId == sprint_id))
        .group_by(su.c.FeatureId, su.c.PageId)
    ).all()
    last_on: dict[tuple[int, int], Any] = {(int(r[0]), int(r[1])): r[2] for r in agg}

    last_by_rows = db.execute(
        select(
            su.c.FeatureId,
            su.c.PageId,
            su.c.UpdatedOn,
            su.c.UpdatedByUserId,
            uu.full_name,
        )
        .select_from(su.outerjoin(uu, uu.id == su.c.UpdatedByUserId))
        .where(and_(su.c.ProjectId == project_id, su.c.SprintId == sprint_id))
        .order_by(su.c.FeatureId, su.c.PageId, su.c.UpdatedOn.desc())
    ).all()
    last_detail: dict[tuple[int, int], tuple[Any, int | None, str | None]] = {}
    for r in last_by_rows:
        key = (int(r[0]), int(r[1]))
        if key not in last_detail and r[2] is not None:
            last_detail[key] = (r[2], int(r[3]) if r[3] is not None else None, r[4])

    for fnode in features_out:
        for pnode in fnode["pages"]:
            key = (fnode["feature_id"], pnode["page_id"])
            if key in last_detail:
                pnode["last_updated_on"] = last_detail[key][0]
                pnode["last_updated_by_user_id"] = last_detail[key][1]
                pnode["last_updated_by_name"] = last_detail[key][2]
            elif key in last_on:
                pnode["last_updated_on"] = last_on[key]

    return {
        "features": features_out,
        "stats": {
            "total_pages": total_pages,
            "assigned_pages": assigned_pages,
            "unassigned_pages": total_pages - assigned_pages,
        },
    }


def fetch_sprint_assignment_management_feature_grid(
    db: Session, *, project_id: int, sprint_id: int, feature_id: int
) -> dict[str, Any]:
    """
    Feature-scoped grid: project feature catalog for one feature merged with sprint assignments.
    Returns a single feature node plus stats for that feature.
    """
    catalog = list_project_feature_page_catalog_for_feature(db, project_id=project_id, feature_id=feature_id)
    assign_tree = fetch_sprint_assignments(db, project_id=project_id, sprint_id=sprint_id)
    f_saved = next((f for f in assign_tree if int(f.get("feature_id")) == int(feature_id)), None)
    by_page: dict[int, dict[str, Any]] = {}
    if f_saved:
        for p in f_saved.get("pages") or []:
            by_page[int(p["page_id"])] = p

    pages_out: list[dict[str, Any]] = []
    total_pages = 0
    assigned_pages = 0
    feature_name: str | None = None

    for row in catalog:
        total_pages += 1
        feature_name = row.get("feature_name") or feature_name
        pid = int(row["page_id"])
        p_saved = by_page.get(pid)
        has_assign = bool(
            p_saved
            and (
                (p_saved.get("developers") and len(p_saved["developers"]) > 0)
                or (p_saved.get("testers") and len(p_saved["testers"]) > 0)
            )
        )
        if has_assign:
            assigned_pages += 1
        pages_out.append(
            {
                "page_id": pid,
                "page_name": row.get("page_name"),
                "developers": (p_saved or {}).get("developers") or [],
                "testers": (p_saved or {}).get("testers") or [],
                "assigned_users": (p_saved or {}).get("assigned_users") or [],
                "primary_developer_id": (p_saved or {}).get("primary_developer_id"),
                "primary_tester_id": (p_saved or {}).get("primary_tester_id"),
                "last_updated_on": None,
                "last_updated_by_user_id": None,
                "last_updated_by_name": None,
                "status": "saved" if has_assign else "unassigned",
            }
        )

    # enrich last_updated per page (feature-scoped)
    su = pt_sprint_page_users
    uu = User
    last_by_rows = db.execute(
        select(
            su.c.PageId,
            su.c.UpdatedOn,
            su.c.UpdatedByUserId,
            uu.full_name,
        )
        .select_from(su.outerjoin(uu, uu.id == su.c.UpdatedByUserId))
        .where(
            and_(
                su.c.ProjectId == project_id,
                su.c.SprintId == sprint_id,
                su.c.FeatureId == feature_id,
            )
        )
        .order_by(su.c.PageId, su.c.UpdatedOn.desc())
    ).all()
    last_detail: dict[int, tuple[Any, int | None, str | None]] = {}
    for r in last_by_rows:
        pid = int(r[0])
        if pid not in last_detail and r[1] is not None:
            last_detail[pid] = (r[1], int(r[2]) if r[2] is not None else None, r[3])

    for p in pages_out:
        pid = int(p["page_id"])
        if pid in last_detail:
            p["last_updated_on"] = last_detail[pid][0]
            p["last_updated_by_user_id"] = last_detail[pid][1]
            p["last_updated_by_name"] = last_detail[pid][2]

    return {
        "feature": {
            "feature_id": int(feature_id),
            "feature_name": feature_name,
            "pages": pages_out,
        },
        "stats": {
            "total_pages": total_pages,
            "assigned_pages": assigned_pages,
            "unassigned_pages": total_pages - assigned_pages,
        },
    }

