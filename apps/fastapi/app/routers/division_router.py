"""
Division Router - API for Class Divisions (Sections)
"""

from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_permission
from app.schemas.auth import CurrentUser
from app.schemas.division_schema import DivisionCreate, DivisionUpdate, DivisionResponse
from app.services import division_service

router = APIRouter(prefix="/api/divisions", tags=["Divisions"])

@router.get("", response_model=list[DivisionResponse])
def list_divisions(
    class_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Classes", "view")),
):
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="User does not belong to a tenant")
    return division_service.get_divisions_for_tenant(
        db=db,
        tenant_id=current_user.tenant_id,
        class_id=class_id,
    )

@router.get("/{division_id}", response_model=DivisionResponse)
def get_division(
    division_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Classes", "view")),
):
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="User does not belong to a tenant")
    return division_service.get_division_by_id(
        db=db,
        division_id=division_id,
        tenant_id=current_user.tenant_id,
    )

@router.post("", response_model=DivisionResponse, status_code=status.HTTP_201_CREATED)
def create_division(
    data: DivisionCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Classes", "create")),
):
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="User does not belong to a tenant")
    return division_service.create_division(
        db=db,
        data=data,
        tenant_id=current_user.tenant_id,
    )

@router.put("/{division_id}", response_model=DivisionResponse)
def update_division(
    division_id: int,
    data: DivisionUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Classes", "edit")),
):
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="User does not belong to a tenant")
    return division_service.update_division(
        db=db,
        division_id=division_id,
        data=data,
        tenant_id=current_user.tenant_id,
    )

@router.delete("/{division_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_division(
    division_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Classes", "delete")),
):
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="User does not belong to a tenant")
    division_service.delete_division(
        db=db,
        division_id=division_id,
        tenant_id=current_user.tenant_id,
    )
    return None
