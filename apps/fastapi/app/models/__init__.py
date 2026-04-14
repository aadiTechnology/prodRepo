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
from app.models.ai_entities import Requirement, UserStory, TestCase, DevelopmentTask
from app.models.theme_template import ThemeTemplate
from app.models.class_fee_structure_assignment import ClassFeeStructureAssignment, AssignmentStatus
from app.models.academic import AcademicYear, SchoolClass, ClassDivision
# from app.models.school_class import SchoolClass
from app.models.fee import FeeCategory, FeeStructure, FeeInstallment
from app.models.fee_discount import FeeDiscount
from app.models.fee_payment import FeePayment, FeePaymentAllocation
from app.models.role_menu_permission import RoleMenuPermission
from app.models.student import Student
from app.models.student_fee_assignment import (
    StudentFeeAssignment,
    StudentFeeDetail,
    StudentFeeInstallment,
)
from app.models.student_fee_ledger import FeeLedger
from app.models.permission import Permission, role_permissions
from app.models.lead import Lead, LeadSource, LeadStatus, LeadFollowup, LeadParent
# Export all models for convenience
__all__ = [
    "Tenant",
    "User",
    "UserRole",
    "UserRoleType",
    "Role",
    "RoleMenuPermission",
    "Feature",
    "Menu",
    "UserProfile",
    "user_roles",
    "role_features",
    "role_menus",
    "Permission",
    "role_permissions",
    "RevokedToken",
    "Requirement",
    "UserStory",
    "TestCase",
    "DevelopmentTask",
    "ThemeTemplate",
    "SchoolClass",
    "ClassDivision",
    "FeeStructure",
    "AcademicYear",
    "FeeCategory",
    "FeeInstallment",
    "FeeDiscount",
    "FeeLedger",
    "Student",
    "StudentFeeAssignment",
    "StudentFeeDetail",
    "StudentFeeInstallment",
    "FeePayment",
    "FeePaymentAllocation",
    "Lead",
    "LeadSource",
    "LeadStatus",
    "LeadFollowup",
    "LeadParent",
]
