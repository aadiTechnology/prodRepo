"""Role CRUD and RBAC endpoints."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.dependencies import require_admin, CurrentUser
from app.schemas.role import RoleCreate, RoleUpdate, RoleResponse
from app.services import role_service


router = APIRouter(prefix="/roles", tags=["Roles"])


@router.get("/", response_model=List[RoleResponse])
async def list_roles(
    tenant_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin),
) -> List[RoleResponse]:
    """List roles (optionally filtered by tenant)."""
    roles = role_service.get_roles(db, tenant_id=tenant_id)
    return roles


@router.get("/{role_id}", response_model=RoleResponse)
async def get_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin),
) -> RoleResponse:
    """Get a single role by ID."""
    return role_service.get_role(db, role_id)


@router.post("/", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
async def create_role(
    data: RoleCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin),
) -> RoleResponse:
    """Create a new role."""
    return role_service.create_role(db, data, created_by=current_user.id)


@router.put("/{role_id}", response_model=RoleResponse)
async def update_role(
    role_id: int,
    data: RoleUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin),
) -> RoleResponse:
    """Update an existing role."""
    return role_service.update_role(db, role_id, data, updated_by=current_user.id)


@router.delete("/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin),
) -> None:
    """Soft delete a role."""
    role_service.soft_delete_role(db, role_id, deleted_by=current_user.id)
    return None

