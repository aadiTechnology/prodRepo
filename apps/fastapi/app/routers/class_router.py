from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_admin, require_permission
from app.schemas.auth import CurrentUser
from app.schemas.school_class_schema import SchoolClassCreate, SchoolClassResponse, SchoolClassUpdate
from app.services import school_class_service

router = APIRouter(prefix="/api/classes", tags=["Classes"])


@router.get("", response_model=list[SchoolClassResponse])
def list_classes(
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Classes", "view")),
):
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="User does not belong to a tenant")
    return school_class_service.get_all_classes(
        db=db,
        tenant_id=current_user.tenant_id,
        search=search,
    )


@router.get("/{class_id}", response_model=SchoolClassResponse)
def get_class_by_id(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Classes", "view")),
):
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="User does not belong to a tenant")
    return school_class_service.get_class_by_id(
        db=db,
        class_id=class_id,
        tenant_id=current_user.tenant_id,
    )


@router.post("", response_model=SchoolClassResponse, status_code=status.HTTP_201_CREATED)
def create_class(
    data: SchoolClassCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Classes", "create")),
):
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="User does not belong to a tenant")
    return school_class_service.create_class(
        db=db,
        data=data,
        tenant_id=current_user.tenant_id,
        created_by=current_user.id,
    )


@router.put("/{class_id}", response_model=SchoolClassResponse)
def update_class(
    class_id: int,
    data: SchoolClassUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Classes", "edit")),
):
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="User does not belong to a tenant")
    return school_class_service.update_class(
        db=db,
        class_id=class_id,
        data=data,
        tenant_id=current_user.tenant_id,
        updated_by=current_user.id,
    )


@router.delete("/{class_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_class(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Classes", "delete")),
):
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="User does not belong to a tenant")
    school_class_service.soft_delete_class(
        db=db,
        class_id=class_id,
        tenant_id=current_user.tenant_id,
        deleted_by=current_user.id,
    )
    return None
