"""Pydantic schemas for Tenant (multi-tenancy)."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class TenantBase(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    is_active: bool = True


class TenantCreate(TenantBase):
    """Schema for creating a new tenant."""

    pass


class TenantUpdate(BaseModel):
    """Schema for updating an existing tenant."""

    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class TenantResponse(TenantBase):
    """Tenant data returned to clients."""

    id: int
    created_at: datetime

    class Config:
        from_attributes = True
