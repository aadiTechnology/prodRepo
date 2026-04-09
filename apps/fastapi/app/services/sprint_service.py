"""Service layer for Sprints CRUD (scoped to selected project)."""

from datetime import date, datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.exceptions import ValidationException
from app.repositories import sprint_repository
from app.schemas.sprint import (
    SprintAssignmentManagementFeatureGridResponse,
    SprintAssignmentManagementGridResponse,
    SprintAssignmentsWrite,
    SprintCreate,
    SprintUpdate,
)
from app.services.report_project_service import assert_can_access_pt_project, list_accessible_report_projects


def _resolve_project_id_for_create(
    db: Session, *, user_tenant_id: int | None, requested_project_id: int | None
) -> int:
    options = list_accessible_report_projects(db, user_tenant_id)
    ids = [int(p["id"]) for p in options]
    if not ids:
        raise ValidationException("No projects available for your account.")
    if len(ids) == 1:
        only = ids[0]
        if requested_project_id is not None and int(requested_project_id) != only:
            raise ValidationException("project_id does not match your assigned project.")
        assert_can_access_pt_project(db, only, user_tenant_id)
        return only
    if requested_project_id is None:
        raise ValidationException(
            "project_id query parameter is required when you have access to more than one project."
        )
    rid = int(requested_project_id)
    if rid not in ids:
        raise ValidationException("Selected project is not available for sprint creation.")
    assert_can_access_pt_project(db, rid, user_tenant_id)
    return rid


def _coerce_bool(v: bool | None, default: bool = False) -> bool:
    return default if v is None else bool(v)


def _normalize_lifecycle_write(
    *,
    is_active: bool | None,
    is_completed: bool | None,
) -> tuple[bool | None, bool | None]:
    """
    Completed sprints are never active. Activating clears completion.
    Returns (is_active, is_completed) for persistence (None = omit column where applicable).
    """
    completed = _coerce_bool(is_completed, False)
    active = is_active
    if completed:
        return False, True
    if active is True:
        return True, False
    if active is False:
        return False, completed if is_completed is not None else False
    return None, completed if is_completed is not None else None


def _validate_date_order(start: date | None, end: date | None) -> None:
    if start is not None and end is not None and start > end:
        raise ValidationException("Sprint start date cannot be after end date.")


def _validate_no_overlap(
    db: Session,
    *,
    project_id: int,
    exclude_sprint_id: int | None,
    start: date | None,
    end: date | None,
) -> None:
    if start is None or end is None:
        return
    _validate_date_order(start, end)
    if sprint_repository.sprint_date_range_overlaps_existing(
        db,
        project_id=project_id,
        exclude_sprint_id=exclude_sprint_id,
        start=start,
        end=end,
    ):
        raise ValidationException(
            "Sprint dates overlap another sprint in this project. Adjust the date range."
        )


def _merge_lifecycle_for_update(existing: dict, patch: dict) -> dict:
    """Apply lifecycle rules to produce DB patch keys is_active / is_completed when needed."""
    if "is_active" not in patch and "is_completed" not in patch:
        return patch

    out = {k: v for k, v in patch.items() if k not in ("is_active", "is_completed")}

    prev_active = _coerce_bool(existing.get("is_active"), False)
    prev_completed = _coerce_bool(existing.get("is_completed"), False)

    next_active = _coerce_bool(patch["is_active"], prev_active) if "is_active" in patch else prev_active
    next_completed = (
        _coerce_bool(patch["is_completed"], prev_completed) if "is_completed" in patch else prev_completed
    )

    if next_completed:
        next_active = False
    elif next_active:
        next_completed = False

    out["is_active"] = next_active
    out["is_completed"] = next_completed
    return out


def _dedupe_int_order(ids: list[int]) -> list[int]:
    seen: set[int] = set()
    out: list[int] = []
    for x in ids:
        if x in seen:
            continue
        seen.add(x)
        out.append(x)
    return out


def _normalize_assignments(
    db: Session,
    *,
    project_id: int,
    feature_assignments: list[dict],
) -> list[dict[str, Any]]:
    """
    Validate and normalize Feature -> Page -> (developers[], testers[]) for PT_SprintPageUsers.
    Legacy payloads use user_ids only (treated as developers). Empty lists clear assignments for that page.
    """
    if not feature_assignments:
        return []

    rows_out: list[dict[str, Any]] = []
    all_page_ids: set[int] = set()
    all_user_ids: set[int] = set()
    all_feature_ids: set[int] = set()

    for f in feature_assignments:
        fid = int(f.get("feature_id"))
        all_feature_ids.add(fid)
        pages = f.get("pages") or []
        for p in pages:
            pid = int(p.get("page_id"))
            all_page_ids.add(pid)
            dev_raw = p.get("developer_user_ids")
            tes_raw = p.get("tester_user_ids")
            legacy = p.get("user_ids")
            if dev_raw is not None or tes_raw is not None:
                dev_list = _dedupe_int_order([int(x) for x in (dev_raw or [])])
                tes_list = _dedupe_int_order([int(x) for x in (tes_raw or [])])
            else:
                dev_list = _dedupe_int_order([int(x) for x in (legacy or [])])
                tes_list = []
            all_user_ids.update(dev_list)
            all_user_ids.update(tes_list)
            for i, uid in enumerate(dev_list):
                rows_out.append(
                    {
                        "FeatureId": fid,
                        "PageId": pid,
                        "UserId": uid,
                        "AssignmentRole": sprint_repository.ROLE_DEVELOPER,
                        "IsPrimary": 1 if i == 0 else 0,
                    }
                )
            for i, uid in enumerate(tes_list):
                rows_out.append(
                    {
                        "FeatureId": fid,
                        "PageId": pid,
                        "UserId": uid,
                        "AssignmentRole": sprint_repository.ROLE_TESTER,
                        "IsPrimary": 1 if i == 0 else 0,
                    }
                )

    valid_features = sprint_repository.resolve_project_feature_ids(
        db, project_id=project_id, feature_ids=sorted(all_feature_ids)
    )
    missing_features = sorted(all_feature_ids - valid_features)
    if missing_features:
        raise ValidationException("One or more selected features do not belong to the selected project.")

    pages_map = sprint_repository.resolve_project_pages(
        db, project_id=project_id, page_ids=sorted(all_page_ids)
    )
    missing_pages = sorted(all_page_ids - set(pages_map.keys()))
    if missing_pages:
        raise ValidationException("One or more selected pages do not belong to the selected project.")

    for r in rows_out:
        fid = int(r["FeatureId"])
        pid = int(r["PageId"])
        row = pages_map.get(pid)
        if row and int(row["feature_id"]) != fid:
            raise ValidationException("Selected page does not belong to the selected feature.")

    if all_user_ids:
        valid_user_ids = sprint_repository.resolve_project_user_ids(
            db, project_id=project_id, user_ids=sorted(all_user_ids)
        )
        missing_users = sorted(all_user_ids - valid_user_ids)
        if missing_users:
            raise ValidationException("One or more selected users do not belong to the selected project.")

    return rows_out


def list_sprints(
    db: Session,
    *,
    project_id: int,
    user_tenant_id: int | None,
    search: str | None,
    page: int,
    page_size: int,
    include_assignments: bool = False,
) -> tuple[list[dict], int]:
    assert_can_access_pt_project(db, project_id, user_tenant_id)
    items, total = sprint_repository.list_sprints(
        db, project_id=project_id, search=search, page=page, page_size=page_size
    )
    if include_assignments and items:
        sids = [int(i["sprint_id"]) for i in items if i.get("sprint_id") is not None]
        amap = sprint_repository.fetch_sprint_assignments_bulk(db, project_id=project_id, sprint_ids=sids)
        for i in items:
            sid = int(i["sprint_id"])
            i["feature_assignments"] = amap.get(sid, [])
    return items, total


def get_sprint(
    db: Session,
    *,
    project_id: int,
    sprint_id: int,
    user_tenant_id: int | None,
) -> dict:
    assert_can_access_pt_project(db, project_id, user_tenant_id)
    row = sprint_repository.get_sprint(db, project_id=project_id, sprint_id=sprint_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sprint not found")
    return row


def create_sprint(
    db: Session,
    *,
    project_id: int | None,
    user_tenant_id: int | None,
    data: SprintCreate,
) -> dict:
    resolved_project_id = _resolve_project_id_for_create(
        db, user_tenant_id=user_tenant_id, requested_project_id=project_id
    )

    active_out, completed_out = _normalize_lifecycle_write(
        is_active=data.is_active,
        is_completed=data.is_completed,
    )

    _validate_no_overlap(
        db,
        project_id=resolved_project_id,
        exclude_sprint_id=None,
        start=data.start_date,
        end=data.end_date,
    )

    row = sprint_repository.create_sprint(
        db,
        project_id=resolved_project_id,
        sprint_name=data.sprint_name.strip(),
        start_date=data.start_date,
        end_date=data.end_date,
        is_active=active_out,
        is_completed=completed_out,
    )

    if active_out is True:
        sprint_repository.deactivate_other_active_sprints(
            db, project_id=resolved_project_id, exclude_sprint_id=int(row["sprint_id"])
        )

    db.commit()
    return row


def update_sprint(
    db: Session,
    *,
    project_id: int,
    sprint_id: int,
    user_tenant_id: int | None,
    data: SprintUpdate,
) -> dict:
    assert_can_access_pt_project(db, project_id, user_tenant_id)
    existing = sprint_repository.get_sprint(db, project_id=project_id, sprint_id=sprint_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sprint not found")

    patch = data.model_dump(exclude_unset=True)
    if "sprint_name" in patch and patch["sprint_name"] is not None:
        patch["sprint_name"] = patch["sprint_name"].strip()

    patch = _merge_lifecycle_for_update(existing, patch)
    if not patch:
        return existing

    start = patch.get("start_date", existing.get("start_date"))
    end = patch.get("end_date", existing.get("end_date"))
    if "start_date" in patch or "end_date" in patch:
        _validate_no_overlap(
            db,
            project_id=project_id,
            exclude_sprint_id=sprint_id,
            start=start,
            end=end,
        )

    row = sprint_repository.update_sprint(db, project_id=project_id, sprint_id=sprint_id, patch=patch)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sprint not found")

    eff_active = row.get("is_active")
    if eff_active is True:
        sprint_repository.deactivate_other_active_sprints(
            db, project_id=project_id, exclude_sprint_id=sprint_id
        )

    db.commit()
    return sprint_repository.get_sprint(db, project_id=project_id, sprint_id=sprint_id) or row


def delete_sprint(
    db: Session,
    *,
    project_id: int,
    sprint_id: int,
    user_tenant_id: int | None,
) -> None:
    assert_can_access_pt_project(db, project_id, user_tenant_id)
    ok = sprint_repository.delete_sprint(db, project_id=project_id, sprint_id=sprint_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sprint not found")
    db.commit()


def assert_can_access(db: Session, *, project_id: int, user_tenant_id: int | None) -> None:
    assert_can_access_pt_project(db, project_id, user_tenant_id)


def list_project_features(db: Session, *, project_id: int) -> list[dict]:
    return sprint_repository.list_project_features(db, project_id=project_id)


def list_feature_pages(db: Session, *, project_id: int, feature_id: int) -> list[dict]:
    return sprint_repository.list_feature_pages(db, project_id=project_id, feature_id=feature_id)


def list_project_users(db: Session, *, project_id: int) -> list[dict]:
    return sprint_repository.list_project_users(db, project_id=project_id)


def get_sprint_assignments(
    db: Session,
    *,
    project_id: int,
    sprint_id: int,
    user_tenant_id: int | None,
) -> dict:
    assert_can_access_pt_project(db, project_id, user_tenant_id)
    s = sprint_repository.get_sprint(db, project_id=project_id, sprint_id=sprint_id)
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sprint not found")
    return {
        "sprint_id": sprint_id,
        "project_id": project_id,
        "feature_assignments": sprint_repository.fetch_sprint_assignments(
            db, project_id=project_id, sprint_id=sprint_id
        ),
    }


def save_sprint_assignments(
    db: Session,
    *,
    project_id: int,
    sprint_id: int,
    user_tenant_id: int | None,
    data: SprintAssignmentsWrite,
    acting_user_id: int | None = None,
) -> dict:
    assert_can_access_pt_project(db, project_id, user_tenant_id)
    s = sprint_repository.get_sprint(db, project_id=project_id, sprint_id=sprint_id)
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sprint not found")

    rows = _normalize_assignments(
        db,
        project_id=project_id,
        feature_assignments=[fa.model_dump() for fa in (data.feature_assignments or [])],
    )
    now = datetime.now(timezone.utc)
    for r in rows:
        r["UpdatedOn"] = now
        r["UpdatedByUserId"] = acting_user_id
    sprint_repository.replace_sprint_page_users(
        db, project_id=project_id, sprint_id=sprint_id, rows=rows
    )
    db.commit()
    return get_sprint_assignments(
        db, project_id=project_id, sprint_id=sprint_id, user_tenant_id=user_tenant_id
    )


def get_sprint_assignment_management_grid(
    db: Session,
    *,
    project_id: int,
    sprint_id: int,
    user_tenant_id: int | None,
) -> SprintAssignmentManagementGridResponse:
    assert_can_access_pt_project(db, project_id, user_tenant_id)
    s = sprint_repository.get_sprint(db, project_id=project_id, sprint_id=sprint_id)
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sprint not found")
    raw = sprint_repository.fetch_sprint_assignment_management_grid(
        db, project_id=project_id, sprint_id=sprint_id
    )
    payload = dict(raw)
    payload["sprint_id"] = sprint_id
    payload["project_id"] = project_id
    payload["sprint_name"] = s.get("sprint_name")
    return SprintAssignmentManagementGridResponse.model_validate(payload)


def get_sprint_assignment_management_feature_grid(
    db: Session,
    *,
    project_id: int,
    sprint_id: int,
    feature_id: int,
    user_tenant_id: int | None,
) -> SprintAssignmentManagementFeatureGridResponse:
    assert_can_access_pt_project(db, project_id, user_tenant_id)
    s = sprint_repository.get_sprint(db, project_id=project_id, sprint_id=sprint_id)
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sprint not found")
    raw = sprint_repository.fetch_sprint_assignment_management_feature_grid(
        db, project_id=project_id, sprint_id=sprint_id, feature_id=feature_id
    )
    payload = dict(raw)
    payload["sprint_id"] = sprint_id
    payload["project_id"] = project_id
    payload["sprint_name"] = s.get("sprint_name")
    return SprintAssignmentManagementFeatureGridResponse.model_validate(payload)


def save_sprint_feature_assignments(
    db: Session,
    *,
    project_id: int,
    sprint_id: int,
    feature_id: int,
    user_tenant_id: int | None,
    acting_user_id: int | None,
    data: SprintAssignmentsWrite,
) -> SprintAssignmentManagementFeatureGridResponse:
    """
    Partial save: only updates assignments for the specified feature.
    Expects payload in the same shape as full save (feature_assignments[]), but uses only that feature.
    """
    assert_can_access_pt_project(db, project_id, user_tenant_id)
    s = sprint_repository.get_sprint(db, project_id=project_id, sprint_id=sprint_id)
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sprint not found")

    feature_payload = [fa.model_dump() for fa in (data.feature_assignments or [])]
    if not feature_payload:
        raise ValidationException("feature_assignments is required.")
    if len(feature_payload) != 1 or int(feature_payload[0].get("feature_id")) != int(feature_id):
        raise ValidationException("Payload must contain exactly one feature_assignment matching feature_id.")

    rows = _normalize_assignments(db, project_id=project_id, feature_assignments=feature_payload)
    # ensure rows are only for this feature (defense-in-depth)
    rows = [r for r in rows if int(r.get("FeatureId")) == int(feature_id)]

    now = datetime.now(timezone.utc)
    for r in rows:
        r["UpdatedOn"] = now
        r["UpdatedByUserId"] = acting_user_id

    sprint_repository.replace_sprint_page_users_for_feature(
        db, project_id=project_id, sprint_id=sprint_id, feature_id=feature_id, rows=rows
    )
    db.commit()
    return get_sprint_assignment_management_feature_grid(
        db,
        project_id=project_id,
        sprint_id=sprint_id,
        feature_id=feature_id,
        user_tenant_id=user_tenant_id,
    )

def delete_sprint_page_assignments(
    db: Session,
    *,
    project_id: int,
    sprint_id: int,
    feature_id: int,
    page_id: int,
    user_tenant_id: int | None,
) -> None:
    assert_can_access_pt_project(db, project_id, user_tenant_id)
    sprint_repository.delete_sprint_page_assignments(
        db,
        project_id=project_id,
        sprint_id=sprint_id,
        feature_id=feature_id,
        page_id=page_id,
    )
    db.commit()
