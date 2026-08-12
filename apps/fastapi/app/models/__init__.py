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
from app.models.refresh_token import RefreshToken
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
from app.models.teacher import Teacher
from app.models.student_fee_assignment import (
    StudentFeeAssignment,
    StudentFeeDetail,
    StudentFeeInstallment,
)
from app.models.student_fee_ledger import FeeLedger
from app.models.permission import Permission, role_permissions
from app.models.lead import Lead, LeadSource, LeadStatus, LeadFollowup, LeadParent
from app.models.student_attendance import StudentAttendance
from app.models.student_invoice import StudentInvoice
from app.models.notice import Notice, NoticeTarget, NoticeAttachment
from app.models.subject import Subject, SubjectClass
from app.models.holiday import Holiday
from app.models.homework import Homework, HomeworkAttachment, HomeworkView
from app.models.demo_video import DemoVideo
from app.models.marketing_hub import MarketingPlatform, MarketingSocialMediaLink
from app.models.activity_gallery import (
    ActivityGallery,
    ActivityGalleryClassMapping,
    ActivityGalleryMedia,
)
from app.models.syllabus import Syllabus, SyllabusAttachment
from app.models.staff_attendance import StaffAttendance
from app.models.attendance_configuration import (
    AttendanceConfiguration,
    AttendanceConfigHoliday,
    AttendanceConfigShift,
    AttendanceConfigStatus,
    AttendanceConfigNotification,
)
from app.models.notification import (
    Notification,
    TenantNotificationScheduleConfig,
    UserDeviceToken,
    UserNotification,
    UserNotificationSettings,
)
from app.models.ai_assistant_chat import AiAssistantSession, AiAssistantMessage
from app.models.ai_assistant_tenant_config import AiAssistantTenantConfig

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
    "RefreshToken",
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
    "Teacher",
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
    "StudentAttendance",
    "StudentInvoice",
    "Notice",
    "NoticeTarget",
    "NoticeAttachment",
    "Subject",
    "SubjectClass",
    "Holiday",
    "Homework",
    "HomeworkAttachment",
    "HomeworkView",
    "DemoVideo",
    "MarketingPlatform",
    "MarketingSocialMediaLink",
    "ActivityGallery",
    "ActivityGalleryMedia",
    "ActivityGalleryClassMapping",
    "Syllabus",
    "SyllabusAttachment",
    "StaffAttendance",
    "AttendanceConfiguration",
    "AttendanceConfigHoliday",
    "AttendanceConfigShift",
    "AttendanceConfigStatus",
    "AttendanceConfigNotification",
    "UserNotification",
    "UserNotificationSettings",
    "TenantNotificationScheduleConfig",
    "UserDeviceToken",
    "Notification",
    "AiAssistantSession",
    "AiAssistantMessage",
    "AiAssistantTenantConfig",
]

