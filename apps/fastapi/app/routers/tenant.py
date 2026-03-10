from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.core.dependencies import require_system_admin, CurrentUser
from app.schemas.tenant import TenantCreate, TenantUpdate, TenantResponse, TenantProvision, TenantListResponse
from app.schemas.user import UserResponse
from app.services import tenant_service
from app.models.tenant import Tenant
from app.models.user import User, UserRole

router = APIRouter(prefix="/tenants", tags=["Tenants"])


@router.get("/", response_model=TenantListResponse)
async def list_tenants(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_system_admin),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=500, description="Items per page"),
    search: Optional[str] = Query(None, description="Filter tenants by name"),
) -> TenantListResponse:
    """List tenants with optional search and pagination. Only Super Admin can access."""
    tenants, total = tenant_service.get_tenants(db, search=search, page=page, page_size=page_size)
    return {"items": tenants, "total": total}


@router.get("/{tenant_id}", response_model=TenantResponse)
async def get_tenant(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_system_admin),
) -> TenantResponse:
    """Get a single tenant profile."""
    return tenant_service.get_tenant(db, tenant_id)


@router.post("/provision", status_code=status.HTTP_201_CREATED)
async def provision_tenant(
    data: TenantProvision,   
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_system_admin),
) -> dict:
    """
    Enterprise-grade tenant provisioning.
    Creates tenant, default ADMIN role, role-menus, and Admin user in one transaction.
    """
    return tenant_service.provision_tenant(db, data, created_by=current_user.id)


@router.put("/{tenant_id}", response_model=TenantResponse)
async def update_tenant(
    tenant_id: int,
    data: TenantUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_system_admin),
) -> TenantResponse:
    """Update an existing tenant."""
    return tenant_service.update_tenant(db, tenant_id, data, updated_by=current_user.id)


@router.delete("/{tenant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tenant(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_system_admin),
) -> None:
    """Soft delete a tenant."""
    tenant_service.soft_delete_tenant(db, tenant_id, deleted_by=current_user.id)
    return None


@router.post("/{tenant_id}/activate", response_model=TenantResponse)
async def activate_tenant(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_system_admin),
) -> TenantResponse:
    """Activate a tenant."""
    return tenant_service.activate_tenant(db, tenant_id, updated_by=current_user.id)


@router.post("/{tenant_id}/deactivate", response_model=TenantResponse)
async def deactivate_tenant(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_system_admin),
) -> TenantResponse:
    """Deactivate a tenant."""
    return tenant_service.deactivate_tenant(db, tenant_id, updated_by=current_user.id)


@router.get("/{tenant_id}/admin-user", response_model=UserResponse)
async def get_tenant_admin_user(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_system_admin),
) -> UserResponse:
    """
    Get the primary admin user for a tenant.
    
    Returns the first admin user found for the given tenant.
    Only system administrators can access this endpoint.
    """
    # Verify tenant exists and is active
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id, Tenant.is_active == True, Tenant.is_deleted == False).first()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found or inactive")
    
    # Find admin users for this tenant
    admin_users = db.query(User).filter(
        User.tenant_id == tenant_id,
        User.is_active == True,
        User.role.in_([UserRole.ADMIN, UserRole.TENANT_ADMIN])
    ).all()
    
    if not admin_users:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No admin user found for this tenant")
    
    # Return the first admin user found
    admin_user = admin_users[0]
    
    return UserResponse(
        id=admin_user.id,
        email=admin_user.email,
        full_name=admin_user.full_name,
        tenant_id=admin_user.tenant_id,
        phone_number=admin_user.phone_number,
        is_active=admin_user.is_active,
        created_at=admin_user.created_at,
    )

