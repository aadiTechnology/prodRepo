from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_admin
from app.schemas.auth import CurrentUser
from app.schemas.academic import AcademicYearCreate, AcademicYearUpdate, AcademicYearResponse
from app.crud import academic_year as academic_year_crud

router = APIRouter(prefix="/api/academic-years", tags=["Academic Years"])

@router.get("", response_model=List[AcademicYearResponse])
def list_academic_years(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="User does not belong to a tenant")
    return academic_year_crud.get_all(db, tenant_id=current_user.tenant_id)

@router.get("/{id}", response_model=AcademicYearResponse)
def get_academic_year(
    id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
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
    current_user: CurrentUser = Depends(require_admin)
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
    current_user: CurrentUser = Depends(require_admin)
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
    current_user: CurrentUser = Depends(require_admin)
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
