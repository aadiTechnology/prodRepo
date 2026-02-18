"""Authentication schemas."""
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from app.models.user import UserRole
from app.schemas.menu import MenuNode

class LoginRequest(BaseModel):
    """Login request schema."""
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    """Token response schema."""
    access_token: str
    token_type: str = "bearer"

class UserWithRole(BaseModel):
    """User response with role."""
    id: int
    email: EmailStr
    full_name: str
    role: UserRole

    class Config:
        from_attributes = True

class CurrentUser(BaseModel):
    """Current authenticated user."""
    id: int
    email: EmailStr
    full_name: str
    role: UserRole
    tenant_id: Optional[int] = None  # Added to support tenant-based authorization

    class Config:
        from_attributes = True


class LoginContextResponse(BaseModel):
    """Extended login response including RBAC context."""

    access_token: str
    token_type: str = "bearer"
    user: UserWithRole
    roles: List[str]
    permissions: List[str]
    menus: List[MenuNode]
