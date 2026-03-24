from datetime import datetime
import logging

from app.models.role import Role  # type: ignore

from fastapi import APIRouter, Depends, status, Query  # type: ignore
from sqlalchemy.orm import Session  # type: ignore
from app.core.database import get_db  # type: ignore
from app.core.dependencies import require_admin, require_system_admin, require_permission, CurrentUser  # type: ignore
from app.schemas.role import RoleCreate, RoleUpdate, RoleResponse, RoleListResponse, RoleListData  # type: ignore
from app.services import role_service  # type: ignore


router = APIRouter(prefix="/roles", tags=["Roles"])

# IMPORTANT: Keep all path literals (e.g. /summary) above path-parameter routes (e.g. /{role_id})
# to avoid accidental matching of /summary as a role_id. See FastAPI routing order.


@router.get("/summary")
async def role_summary(db: Session = Depends(get_db), current_user: CurrentUser = Depends(require_system_admin)):
    """Get a summary of roles."""
    total_roles = db.query(Role).filter(Role.is_deleted == False).count()
    platform_roles = db.query(Role).filter(Role.scope_type == "Platform", Role.is_deleted == False).count()
    tenant_roles = db.query(Role).filter(Role.scope_type == "Tenant", Role.is_deleted == False).count()
    active_roles = db.query(Role).filter(Role.is_active == True, Role.is_deleted == False).count()
    inactive_roles = db.query(Role).filter(Role.is_active == False, Role.is_deleted == False).count()
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


@router.get("/dropdown")
async def get_roles_dropdown(db: Session = Depends(get_db)):
    """Get simple role list for dropdowns (id and name only) - no authentication required for dropdowns."""
    try:
        roles = db.query(Role.id, Role.name).filter(Role.is_deleted == False, Role.is_active == True).all()
        return {
            "success": True,
            "data": [{"id": r[0], "name": r[1]} for r in roles]
        }
    except Exception as e:
        logging.error(f"Error fetching roles dropdown: {str(e)}")
        return {"success": False, "data": [], "message": str(e)}


@router.get("", response_model=RoleListResponse)
async def list_roles(
    search: str = Query(None),
    page_number: int = Query(1, alias="pageNumber"),
    page_size: int = Query(50, alias="pageSize"),
    scope_type: str = Query(None),
    tenant_id: int = Query(None),
    status: bool = Query(None),
    created_from: datetime = Query(None, alias="createdFrom"),
    created_to: datetime = Query(None, alias="createdTo"),
    sort_by: str = Query("id", alias="sortBy"),
    sort_order: str = Query("desc", alias="sortOrder"),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Roles", "view")),
) -> RoleListResponse:
    logging.debug(f"User: {current_user.email}, Role: {current_user.role}, Tenant: {current_user.tenant_id}")
    print(f"page_size={page_size}, page_number={page_number}")
    from app.models.user import UserRole  # type: ignore
    is_platform = current_user.role == UserRole.SUPER_ADMIN
    # Use current_user's tenant_id if not a platform admin
    effective_tenant_id = None if is_platform else current_user.tenant_id

    roles, total = role_service.get_roles(
        db, search, page_number, page_size, tenant_id=effective_tenant_id, is_platform=is_platform,
        created_from=created_from, created_to=created_to,
        sort_by=sort_by, sort_order=sort_order
    )
    return RoleListResponse(
        success=True,
        data=RoleListData(
            items=[RoleResponse.model_validate(r) for r in roles],
            totalCount=total,
            pageNumber=page_number,
            pageSize=page_size,
        ),
    )


@router.get("/{role_id}", response_model=RoleResponse)
async def get_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Roles", "view")),
) -> RoleResponse:
    """Get a single role by ID with tenant isolation."""
    from app.models.user import UserRole  # type: ignore
    is_platform = current_user.role == UserRole.SUPER_ADMIN
    effective_tenant_id = None if is_platform else current_user.tenant_id
    
    role = role_service.get_role(db, role_id, tenant_id=effective_tenant_id)
    return RoleResponse.model_validate(role)


@router.post("", response_model=RoleResponse)
async def create_role(
    data: RoleCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Roles", "create")),
) -> RoleResponse:
    """Create a new role with tenant enforcement."""
    from app.models.user import UserRole  # type: ignore
    is_platform = current_user.role == UserRole.SUPER_ADMIN
    
    if not is_platform:
        # Enforce tenant_id and scope_type for tenant admins
        data.tenant_id = current_user.tenant_id
        data.scope_type = "Tenant"
        
    role = role_service.create_role(db, data, created_by=current_user.id)
    return RoleResponse.model_validate(role)


@router.put("/{role_id}", response_model=RoleResponse)
async def update_role(
    role_id: int,
    data: RoleUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Roles", "edit")),
) -> RoleResponse:
    """Update an existing role with tenant isolation."""
    from app.models.user import UserRole  # type: ignore
    is_platform = current_user.role == UserRole.SUPER_ADMIN
    effective_tenant_id = None if is_platform else current_user.tenant_id
    
    role = role_service.update_role(db, role_id, data, updated_by=current_user.id, tenant_id=effective_tenant_id)
    return RoleResponse.model_validate(role)



@router.put("/{role_id}/activate")
async def activate_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Roles", "edit")),
):
    """Activate a role with tenant isolation."""
    # Use effective_tenant_id to ensure tenant admin can only activate their own roles
    from app.models.user import UserRole # type: ignore
    is_platform = current_user.role == UserRole.SUPER_ADMIN
    effective_tenant_id = None if is_platform else current_user.tenant_id
    
    role_service.activate_role(db, role_id, current_user.id, tenant_id=effective_tenant_id)
    return {"success": True}



@router.put("/{role_id}/deactivate")
async def deactivate_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Roles", "edit")),
):
    """Deactivate a role with tenant isolation."""
    from app.models.user import UserRole # type: ignore
    is_platform = current_user.role == UserRole.SUPER_ADMIN
    effective_tenant_id = None if is_platform else current_user.tenant_id

    role_service.deactivate_role(db, role_id, current_user.id, tenant_id=effective_tenant_id)
    return {"success": True}


@router.delete("/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Roles", "delete")),
) -> None:
    """Soft delete a role with tenant isolation."""
    from app.models.user import UserRole  # type: ignore
    is_platform = current_user.role == UserRole.SUPER_ADMIN
    effective_tenant_id = None if is_platform else current_user.tenant_id
    
    role_service.soft_delete_role(db, role_id, deleted_by=current_user.id, tenant_id=effective_tenant_id)
    return None

