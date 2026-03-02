"""Pydantic schemas for Role (RBAC)."""

from datetime import datetime
from typing import Optional, List
from app.schemas.permission import PermissionResponse

from pydantic import BaseModel, field_validator


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
    tenant_id: Optional[int] = None
    description: Optional[str] = None
    is_active: bool = True
    permission_ids: List[int]
    is_system: bool = False
    tenant_id: Optional[int] = None
    feature_ids: List[int] = []
    menu_ids: List[int] = []




class RoleUpdate(BaseModel):
    """Schema for updating an existing role."""

    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    feature_ids: Optional[List[int]] = None
    menu_ids: Optional[List[int]] = None
permission_ids: Optional[List[int]] = None

class RoleResponse(BaseModel):
    """Role data returned to clients."""

    id: int
    code: str
    name: str
    scope_type: str
    tenant_id: Optional[int]
    description: Optional[str]
    is_system: bool
    is_active: bool
    created_at: datetime
    created_by: Optional[int]
    updated_at: Optional[datetime]
    updated_by: Optional[int]
    is_deleted: bool
    deleted_at: Optional[datetime]
    deleted_by: Optional[int]
    permissions: List[PermissionResponse]


    @classmethod
    def model_validate(cls, obj):
        # Convert permissions to PermissionResponse
        permissions = [PermissionResponse.model_validate(p) for p in getattr(obj, 'permissions', [])]
        data = obj.__dict__.copy()
        data['permissions'] = permissions
        return cls(**data)

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

