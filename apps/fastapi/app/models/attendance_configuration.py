from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.mssql import NVARCHAR

from app.core.database import Base


class AttendanceConfiguration(Base):
    """Per-tenant, per-academic-year attendance configuration settings."""

    __tablename__ = "attendance_configurations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="NO ACTION"), nullable=False)
    academic_year_id = Column(
        Integer, ForeignKey("academic_years.id", ondelete="NO ACTION"), nullable=False
    )

    configuration_scope = Column(String(30), nullable=False, default="entire-school")
    allow_editing_after_marked = Column(Boolean, nullable=False, default=True)
    apply_changes_to = Column(String(30), nullable=False, default="future-only")
    marked_by_teacher = Column(Boolean, nullable=False, default=True)
    marked_by_school_admin = Column(Boolean, nullable=False, default=True)

    working_monday = Column(Boolean, nullable=False, default=True)
    working_tuesday = Column(Boolean, nullable=False, default=True)
    working_wednesday = Column(Boolean, nullable=False, default=True)
    working_thursday = Column(Boolean, nullable=False, default=True)
    working_friday = Column(Boolean, nullable=False, default=True)
    working_saturday = Column(Boolean, nullable=False, default=False)
    working_sunday = Column(Boolean, nullable=False, default=False)

    office_start_time = Column(String(5), nullable=False, default="09:00")
    office_end_time = Column(String(5), nullable=False, default="17:00")
    minimum_working_hours = Column(Integer, nullable=False, default=6)

    grace_enabled = Column(Boolean, nullable=False, default=True)
    grace_minutes = Column(Integer, nullable=False, default=15)
    status_after_grace = Column(String(30), nullable=False, default="Late")

    check_in_mandatory = Column(Boolean, nullable=False, default=True)
    check_out_mandatory = Column(Boolean, nullable=False, default=True)
    allow_attendance_without_check_out = Column(Boolean, nullable=False, default=False)
    allow_multiple_check_in = Column(Boolean, nullable=False, default=False)
    allow_next_day_check_out = Column(Boolean, nullable=False, default=False)
    auto_calculate_working_hours = Column(Boolean, nullable=False, default=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=True)
    updated_at = Column(DateTime, nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=True)
    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=True)

    __table_args__ = (
        UniqueConstraint(
            "tenant_id",
            "academic_year_id",
            name="UQ_att_cfg_tenant_academic_year",
        ),
    )


class AttendanceConfigHoliday(Base):
    __tablename__ = "attendance_config_holidays"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="NO ACTION"), nullable=False)
    configuration_id = Column(
        Integer,
        ForeignKey("attendance_configurations.id", ondelete="NO ACTION"),
        nullable=False,
    )
    name = Column(NVARCHAR(150), nullable=False)
    holiday_date = Column(Date, nullable=False)
    description = Column(NVARCHAR(500), nullable=True)
    status = Column(String(20), nullable=False, default="active")

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=True)
    updated_at = Column(DateTime, nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=True)
    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=True)


class AttendanceConfigShift(Base):
    __tablename__ = "attendance_config_shifts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="NO ACTION"), nullable=False)
    configuration_id = Column(
        Integer,
        ForeignKey("attendance_configurations.id", ondelete="NO ACTION"),
        nullable=False,
    )
    name = Column(NVARCHAR(100), nullable=False)
    start_time = Column(String(5), nullable=False)
    end_time = Column(String(5), nullable=False)
    status = Column(String(20), nullable=False, default="active")

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=True)
    updated_at = Column(DateTime, nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=True)
    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=True)


class AttendanceConfigStatus(Base):
    __tablename__ = "attendance_config_statuses"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="NO ACTION"), nullable=False)
    configuration_id = Column(
        Integer,
        ForeignKey("attendance_configurations.id", ondelete="NO ACTION"),
        nullable=False,
    )
    name = Column(NVARCHAR(50), nullable=False)
    color = Column(String(20), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    sort_order = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=True)
    updated_at = Column(DateTime, nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=True)
    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=True)


class AttendanceConfigNotification(Base):
    __tablename__ = "attendance_config_notifications"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="NO ACTION"), nullable=False)
    configuration_id = Column(
        Integer,
        ForeignKey("attendance_configurations.id", ondelete="NO ACTION"),
        nullable=False,
    )
    label = Column(NVARCHAR(150), nullable=False)
    recipients = Column(String(100), nullable=False)
    triggers = Column(String(100), nullable=False)
    channels = Column(String(50), nullable=False)
    is_enabled = Column(Boolean, nullable=False, default=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=True)
    updated_at = Column(DateTime, nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=True)
    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=True)
