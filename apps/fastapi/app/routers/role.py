import logging

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.role import Role

from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.dependencies import require_admin, require_system_admin, CurrentUser
from app.schemas.role import RoleCreate, RoleUpdate, RoleResponse, RoleListResponse
from app.services import role_service


router = APIRouter(prefix="/roles", tags=["Roles"])


@router.get("/summary")
async def role_summary(db: Session = Depends(get_db), current_user: CurrentUser = Depends(require_system_admin)):
    """Get a summary of roles."""
    total_roles = db.query(Role).count()
    platform_roles = db.query(Role).filter(Role.scope_type == "Platform").count()
    tenant_roles = db.query(Role).filter(Role.scope_type == "Tenant").count()
    active_roles = db.query(Role).filter(Role.is_active == True).count()
    inactive_roles = db.query(Role).filter(Role.is_active == False).count()
    return {
        "success": True,
        "data": {
            "totalRoles": total_roles,
            "platformRoles": platform_roles,
            "tenantRoles": tenant_roles,
            "activeRoles": active_roles,
            "inactiveRoles": inactive_roles
        }
    }


@router.get("", response_model=RoleListResponse)
async def list_roles(
    search: str = Query(None),
    page_number: int = Query(1, alias="pageNumber"),
    page_size: int = Query(10, alias="pageSize"),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_system_admin),
) -> RoleListResponse:
    """List roles (optionally filtered by tenant)."""
    logging.warning(f"User: {current_user.email}, Role: {current_user.role}, Tenant: {current_user.tenant_id}")
    # Determine if we should show platform roles (Super Admin) or tenant roles
    from app.models.user import UserRole
    is_platform = current_user.role == UserRole.SUPER_ADMIN
    
    roles, total_count = role_service.get_roles(
        db, search, page_number, page_size, current_user.tenant_id, is_platform
    )
    return {
        "success": True,
        "data": {
            "items": [RoleResponse.from_orm(r) for r in roles],
            "totalCount": total_count,
            "pageNumber": page_number,
            "pageSize": page_size,
        }
    }


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


@router.put("/{role_id}/activate")
async def activate_role(
    role_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_system_admin),
):
    role_service.activate_role(db, role_id, current_user.id)
    return {"success": True}


@router.put("/{role_id}/deactivate")
async def deactivate_role(
    role_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_system_admin),
):
    role_service.deactivate_role(db, role_id, current_user.id)
    return {"success": True}


@router.delete("/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin),
) -> None:
    """Soft delete a role."""
    role_service.soft_delete_role(db, role_id, deleted_by=current_user.id)
    return None

