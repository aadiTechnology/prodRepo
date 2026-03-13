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
from app.models.revoked_token import RevokedToken
from app.models.ai_entities import Requirement, UserStory, TestCase
from app.models.theme_template import ThemeTemplate
from app.models.school_class import SchoolClass
from app.models.fee_category import FeeCategory
# Export all models for convenience
__all__ = [
    "Tenant",
    "SchoolClass",
    "FeeCategory",
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
    "RevokedToken",
    "Requirement",
    "UserStory",
    "TestCase",
    "ThemeTemplate",
]
