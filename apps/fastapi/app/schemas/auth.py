"""Authentication schemas."""
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.models.user import UserRole

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

    class Config:
        from_attributes = True
