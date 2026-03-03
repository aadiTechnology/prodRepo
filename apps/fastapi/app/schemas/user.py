from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, EmailStr
from app.models.user import UserRole


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: str

    @classmethod
    def validate_full_name(cls, value):
        if not value or len(value) < 2:
            raise ValueError("Full name must be at least 2 characters.")
        return value

    @classmethod
    def validate_password(cls, value):
        if not value or len(value) < 8:
            raise ValueError("Password must be at least 8 characters.")
        return value

    @classmethod
    def validate_email(cls, value):
        if not value or "@" not in value:
            raise ValueError("Invalid email format.")
        return value


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    is_active: Optional[bool] = None
    tenant_id: Optional[int] = None
    role: Optional[str] = None
    # Email and password are not editable


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
    roles: Optional[List[str]] = None  # roles included for multiple role support

    class Config:
        from_attributes = True


class ChangePasswordRequest(BaseModel):
    currentPassword: str
    newPassword: str
    # confirmPassword: str


class ChangePasswordResponse(BaseModel):
    success: bool
    message: str
