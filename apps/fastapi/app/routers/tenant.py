"""Tenant CRUD endpoints for multi-tenant support."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.dependencies import require_admin, CurrentUser
from app.schemas.tenant import TenantCreate, TenantUpdate, TenantResponse
from app.services import tenant_service


router = APIRouter(prefix="/tenants", tags=["Tenants"])


@router.get("/", response_model=List[TenantResponse])
async def list_tenants(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin),
) -> List[TenantResponse]:
    """List all tenants."""
    tenants = tenant_service.get_tenants(db)
    return tenants


@router.get("/{tenant_id}", response_model=TenantResponse)
async def get_tenant(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin),
) -> TenantResponse:
    """Get a single tenant by ID."""
    return tenant_service.get_tenant(db, tenant_id)


@router.post("/", response_model=TenantResponse, status_code=status.HTTP_201_CREATED)
async def create_tenant(
    data: TenantCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin),
) -> TenantResponse:
    """Create a new tenant."""
    return tenant_service.create_tenant(db, data, created_by=current_user.id)


@router.put("/{tenant_id}", response_model=TenantResponse)
async def update_tenant(
    tenant_id: int,
    data: TenantUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin),
) -> TenantResponse:
    """Update an existing tenant."""
    return tenant_service.update_tenant(db, tenant_id, data, updated_by=current_user.id)


@router.delete("/{tenant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tenant(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin),
) -> None:
    """Soft delete a tenant."""
    tenant_service.soft_delete_tenant(db, tenant_id, deleted_by=current_user.id)
    return None
