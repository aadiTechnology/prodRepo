"""Service layer for Sprints CRUD (scoped to selected project)."""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.services.report_project_service import assert_can_access_pt_project
from app.repositories import sprint_repository
from app.schemas.sprint import SprintCreate, SprintUpdate


def list_sprints(
    db: Session,
    *,
    project_id: int,
    user_tenant_id: int | None,
    search: str | None,
    page: int,
    page_size: int,
) -> tuple[list[dict], int]:
    assert_can_access_pt_project(db, project_id, user_tenant_id)
    return sprint_repository.list_sprints(db, project_id=project_id, search=search, page=page, page_size=page_size)


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
    project_id: int,
    user_tenant_id: int | None,
    data: SprintCreate,
) -> dict:
    assert_can_access_pt_project(db, project_id, user_tenant_id)
    row = sprint_repository.create_sprint(
        db,
        project_id=project_id,
        sprint_name=data.sprint_name.strip(),
        start_date=data.start_date,
        end_date=data.end_date,
        is_active=data.is_active,
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
    patch = data.model_dump(exclude_unset=True)
    if "sprint_name" in patch and patch["sprint_name"] is not None:
        patch["sprint_name"] = patch["sprint_name"].strip()
    row = sprint_repository.update_sprint(db, project_id=project_id, sprint_id=sprint_id, patch=patch)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sprint not found")
    db.commit()
    return row


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

