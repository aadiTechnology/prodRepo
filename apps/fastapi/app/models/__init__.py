"""
Models package initialization.
Import all models here to ensure SQLAlchemy can resolve relationships.
Import order matters: base models first, then dependent models.
"""

# Import in order: base models first, then dependent models
from app.models.tenant import Tenant
from app.models.user import User, UserRole, UserRoleType
from app.models.role import Role, user_roles, role_features, role_menus
from app.models.feature import Feature
from app.models.menu import Menu
from app.models.user_profile import UserProfile
from app.models.revoked_token import RevokedToken  # <-- Add this line

# Export all models for convenience
__all__ = [
    "Tenant",
    "User",
    "UserRole",
    "UserRoleType",
    "Role",
    "Feature",
    "Menu",
    "UserProfile",
    "user_roles",
    "role_features",
    "role_menus",
    "RevokedToken",  # <-- Add this line
]
