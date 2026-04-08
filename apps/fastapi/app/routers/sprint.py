from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.schemas.auth import CurrentUser
from app.schemas.sprint import (
    OptionItem,
    SprintAssignmentOptionsResponse,
    SprintCreate,
    SprintListResponse,
    SprintResponse,
    SprintUpdate,
)
from app.services import sprint_service

router = APIRouter(prefix="/sprints", tags=["Sprints"])


@router.get("", response_model=SprintListResponse)
@router.get("/", response_model=SprintListResponse)
def list_sprints(
    project_id: int = Query(..., description="PT_Project.Id (selected project)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=500),
    search: str | None = Query(default=None, description="Filter by sprint name"),
    include_assignments: bool = Query(
        default=False, description="When true, include feature/page/user assignments in each item."
    ),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> SprintListResponse:
    items, total = sprint_service.list_sprints(
        db,
        project_id=project_id,
        user_tenant_id=current_user.tenant_id,
        search=search,
        page=page,
        page_size=page_size,
        include_assignments=include_assignments,
    )
    return {"items": items, "total": total}


@router.get("/assignment-options", response_model=SprintAssignmentOptionsResponse)
def get_sprint_assignment_options(
    project_id: int = Query(..., description="PT_Project.Id (selected project)"),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> SprintAssignmentOptionsResponse:
    """Features + users options for sprint assignment UI (project-scoped)."""
    sprint_service.assert_can_access(db, project_id=project_id, user_tenant_id=current_user.tenant_id)
    return {
        "features": sprint_service.list_project_features(db, project_id=project_id),
        "users": sprint_service.list_project_users(db, project_id=project_id),
    }


@router.get("/assignment-pages", response_model=list[OptionItem])
def list_pages_for_feature(
    project_id: int = Query(..., description="PT_Project.Id (selected project)"),
    feature_id: int = Query(..., description="PT_Features.FeatureId"),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> list[OptionItem]:
    """Pages for a feature (project-scoped)."""
    sprint_service.assert_can_access(db, project_id=project_id, user_tenant_id=current_user.tenant_id)
    return sprint_service.list_feature_pages(db, project_id=project_id, feature_id=feature_id)


@router.post("", response_model=SprintResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=SprintResponse, status_code=status.HTTP_201_CREATED)
def create_sprint(
    data: SprintCreate,
    project_id: Optional[int] = Query(
        None,
        description="PT_Project.Id. Required when the user has access to more than one project; "
        "omitted when only one project is available (it is assigned automatically).",
    ),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> SprintResponse:
    return sprint_service.create_sprint(
        db,
        project_id=project_id,
        user_tenant_id=current_user.tenant_id,
        data=data,
    )


@router.put("/{sprint_id}", response_model=SprintResponse)
def update_sprint(
    sprint_id: int,
    data: SprintUpdate,
    project_id: int = Query(..., description="PT_Project.Id (selected project)"),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> SprintResponse:
    return sprint_service.update_sprint(
        db,
        project_id=project_id,
        sprint_id=sprint_id,
        user_tenant_id=current_user.tenant_id,
        data=data,
    )


@router.delete("/{sprint_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sprint(
    sprint_id: int,
    project_id: int = Query(..., description="PT_Project.Id (selected project)"),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> None:
    sprint_service.delete_sprint(
        db,
        project_id=project_id,
        sprint_id=sprint_id,
        user_tenant_id=current_user.tenant_id,
    )
    return None


@router.get("/{sprint_id}", response_model=SprintResponse)
def get_sprint(
    sprint_id: int,
    project_id: int = Query(..., description="PT_Project.Id (selected project)"),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> SprintResponse:
    return sprint_service.get_sprint(
        db,
        project_id=project_id,
        sprint_id=sprint_id,
        user_tenant_id=current_user.tenant_id,
    )

