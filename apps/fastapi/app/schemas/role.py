"""Pydantic schemas for Role (RBAC)."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class RoleBase(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    is_system: bool = False
    is_active: bool = True


class RoleCreate(RoleBase):
    """Schema for creating a new role."""

    tenant_id: Optional[int] = None


class RoleUpdate(BaseModel):
    """Schema for updating an existing role."""

    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class RoleResponse(RoleBase):
    """Role data returned to clients."""

    id: int
    tenant_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

