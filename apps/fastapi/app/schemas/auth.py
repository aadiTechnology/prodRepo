"""Authentication schemas."""
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
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

class TenantInfo(BaseModel):
    """Tenant information returned at login and /me. Includes theme template config when assigned."""
    id: int
    name: str
    code: str
    logo_url: Optional[str] = None
    theme_template_id: Optional[int] = None
    """When set, theme_config contains the template's token overrides for dynamic theme generation."""
    theme_config: Optional[dict[str, Any]] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pin_code: Optional[str] = None

    class Config:
        from_attributes = True

class UserWithRole(BaseModel):
    """User response with role."""
    id: int
    email: EmailStr
    full_name: str
    role: UserRole
    tenant_id: Optional[int] = None
    tenant: Optional[TenantInfo] = None
    profile_image_path: Optional[str] = None
    is_impersonation: Optional[bool] = None
    original_user_id: Optional[int] = None

    class Config:
        from_attributes = True

class CurrentUser(BaseModel):
    """Current authenticated user."""
    id: int
    email: EmailStr
    full_name: str
    role: UserRole
    tenant_id: Optional[int] = None
    is_impersonation: Optional[bool] = None
    original_user_id: Optional[int] = None

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
    tenant: Optional[TenantInfo] = None

def create_user_with_role(user):
    """Create a user with role."""
    return CurrentUser(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        tenant_id=user.tenant_id
    )