from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.schemas.auth import CurrentUser
from app.schemas.task_effort import (
    ActiveSprintResponse,
    EffortMutationResponse,
    EffortSaveRequest,
    TaskCloseRequest,
    TaskEffortListResponse,
    TaskStatusItem,
)
from app.services import task_effort_service

router = APIRouter(prefix="/task-effort", tags=["Task effort"])


@router.get("/statuses", response_model=list[TaskStatusItem])
def list_task_statuses(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> list[TaskStatusItem]:
    _ = current_user
    return task_effort_service.list_statuses(db)


@router.get("/active-sprint", response_model=ActiveSprintResponse)
def get_active_sprint(
    project_id: int = Query(..., description="PT_Project.Id"),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ActiveSprintResponse:
    sid = task_effort_service.get_active_sprint_id(
        db, project_id=project_id, user_tenant_id=current_user.tenant_id
    )
    return ActiveSprintResponse(sprint_id=sid)


@router.get("/tasks", response_model=TaskEffortListResponse)
def list_my_tasks(
    project_id: int = Query(..., description="PT_Project.Id"),
    sprint_id: int = Query(...),
    feature_id: int = Query(...),
    page_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> TaskEffortListResponse:
    return task_effort_service.list_my_tasks(
        db,
        project_id=project_id,
        user_id=current_user.id,
        user_tenant_id=current_user.tenant_id,
        sprint_id=sprint_id,
        feature_id=feature_id,
        page_id=page_id,
    )


@router.post("/save-effort", response_model=EffortMutationResponse)
def save_effort(
    body: EffortSaveRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> EffortMutationResponse:
    return task_effort_service.save_effort(
        db,
        project_id=body.project_id,
        user_id=current_user.id,
        user_tenant_id=current_user.tenant_id,
        timesheet_id=body.timesheet_id,
        working_date=body.working_date,
        effort_hours=body.effort_hours,
    )


@router.post("/close", response_model=EffortMutationResponse)
def close_task(
    body: TaskCloseRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> EffortMutationResponse:
    return task_effort_service.close_task(
        db,
        project_id=body.project_id,
        user_id=current_user.id,
        user_tenant_id=current_user.tenant_id,
        timesheet_id=body.timesheet_id,
        working_date=body.working_date,
    )
