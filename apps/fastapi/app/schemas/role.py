"""Pydantic schemas for Role (RBAC)."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, validator


class RoleBase(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    is_system: bool = False
    is_active: bool = True


class RoleCreate(BaseModel):
    """Schema for creating a new role."""

    code: str
    name: str
    scope_type: str
    description: Optional[str] = None
    is_active: bool = True
    is_system: bool = False
    tenant_id: Optional[int] = None
    feature_ids: List[int] = []
    menu_ids: List[int] = []

    @validator('name')
    def name_required(cls, v):
        if not v or not v.strip():
            raise ValueError('Role name is required')
        return v

    @validator('scope_type')
    def scope_type_required(cls, v):
        if v not in ['Platform', 'Tenant']:
            raise ValueError('Scope must be Platform or Tenant')
        return v

    @validator('tenant_id')
    def tenant_id_rule(cls, v, values):
        if values.get('scope_type') == 'Tenant' and not v:
            raise ValueError('TenantId required for Tenant scope')
        if values.get('scope_type') == 'Platform' and v:
            raise ValueError('TenantId must be null for Platform scope')
        return v


class RoleUpdate(BaseModel):
    """Schema for updating an existing role."""

    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    feature_ids: Optional[List[int]] = None
    menu_ids: Optional[List[int]] = None


class RoleResponse(BaseModel):
    """Role data returned to clients."""

    id: int
    name: str
    scope_type: str
    description: Optional[str]
    is_active: bool
    is_system: bool
    created_at: datetime
    created_by: Optional[int]  # <-- Change from str to Optional[int]
    updated_at: Optional[datetime]
    updated_by: Optional[int]  # <-- Change from str to Optional[int]
    tenant_id: Optional[int]
    # row_version: Optional[bytes]  # <-- Make Optional if it can be None

    class Config:
        from_attributes = True


class RoleListData(BaseModel):
    items: List[RoleResponse]
    totalCount: int
    pageNumber: int
    pageSize: int


class RoleListResponse(BaseModel):
    success: bool
    data: RoleListData

    class Config:
        from_attributes = True

