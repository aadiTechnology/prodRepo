from fastapi import APIRouter, Depends, status, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.core.dependencies import (
    get_current_user,
    require_permission,
    resolve_tenant_id_for_academic_year_list,
)
from app.schemas.auth import CurrentUser
from app.schemas.academic import AcademicYearCreate, AcademicYearUpdate, AcademicYearResponse
from app.crud import academic_year as academic_year_crud

router = APIRouter(prefix="/api/academic-years", tags=["Academic Years"])

@router.get("", response_model=List[AcademicYearResponse])
def list_academic_years(
    active_only: bool = Query(
        False,
        description="When true, return only active academic years (for dropdowns).",
    ),
    tenant_id: Optional[int] = Query(
        None,
        ge=1,
        description="School tenant. Required for system administrators.",
    ),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    effective_tenant_id = resolve_tenant_id_for_academic_year_list(
        db, current_user, tenant_id
    )
    return academic_year_crud.get_all(
        db,
        tenant_id=effective_tenant_id,
        active_only=active_only,
    )

@router.get("/{id}", response_model=AcademicYearResponse)
def get_academic_year(
    id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Academic Years", "view"))
):
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="User does not belong to a tenant")
    db_obj = academic_year_crud.get_by_id(db, id=id, tenant_id=current_user.tenant_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Academic year not found")
    return db_obj

@router.post("", response_model=AcademicYearResponse, status_code=status.HTTP_201_CREATED)
def create_academic_year(
    data: AcademicYearCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Academic Years", "create"))
):
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="User does not belong to a tenant")
    return academic_year_crud.create(
        db=db,
        data=data,
        tenant_id=current_user.tenant_id,
        created_by=current_user.id
    )

@router.put("/{id}", response_model=AcademicYearResponse)
def update_academic_year(
    id: int,
    data: AcademicYearUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Academic Years", "edit"))
):
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="User does not belong to a tenant")
    return academic_year_crud.update(
        db=db,
        id=id,
        data=data,
        tenant_id=current_user.tenant_id,
        updated_by=current_user.id
    )

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_academic_year(
    id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Academic Years", "delete"))
):
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="User does not belong to a tenant")
    academic_year_crud.soft_delete(
        db=db,
        id=id,
        tenant_id=current_user.tenant_id,
        deleted_by=current_user.id
    )
    return None
