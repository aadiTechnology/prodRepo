from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr
from app.models.user import UserRole


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    tenant_id: Optional[int] = None
    phone_number: Optional[str] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    is_active: Optional[bool] = None
    tenant_id: Optional[int] = None


class UserPasswordUpdate(BaseModel):
    """Payload for updating a user's password (admin-initiated)."""

    new_password: str


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    tenant_id: Optional[int] = None
    phone_number: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
