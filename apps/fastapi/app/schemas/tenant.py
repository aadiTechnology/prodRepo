"""Pydantic schemas for Tenant (multi-tenancy)."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, EmailStr


class TenantBase(BaseModel):
    code: Optional[str] = None
    name: str
    owner_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = True
    # Branding
    logo_url: Optional[str] = None
    theme_template_id: Optional[int] = None
    # Address
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pin_code: Optional[str] = None


class TenantCreate(TenantBase):
    """Schema for creating a new tenant."""
    pass


class TenantProvision(TenantBase):
    """Schema for the full tenant provisioning workflow."""
    owner_name: str # Required for provisioning
    email: EmailStr # Required for provisioning
    admin_password: str = Field(..., min_length=8)
    
    # logo_url and address fields are inherited from TenantBase


class TenantUpdate(BaseModel):
    """Schema for updating an existing tenant."""
    name: Optional[str] = None
    owner_name: Optional[str] = None
    phone: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    # Branding
    logo_url: Optional[str] = None
    theme_template_id: Optional[int] = None
    # Address
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pin_code: Optional[str] = None


class TenantResponse(TenantBase):
    """Tenant data returned to clients."""

    id: int
    code: str
    created_at: datetime

    class Config:
        from_attributes = True


class TenantListResponse(BaseModel):
    items: list[TenantResponse]
    total: int
