"""In-app notification models: canonical notifications + per-user inbox/settings."""

from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.mssql import NVARCHAR

from app.core.database import Base


class Notification(Base):
    """
    Canonical notification record (From / To / Subject / Body).

    Modules call the generic create service which persists here first.
    Firebase / push delivery should read from this table (not send ad-hoc payloads).
    """

    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    # DB columns are reserved words "from" / "to" — mapped via name=
    sender = Column("from", NVARCHAR(255), nullable=False)
    recipient = Column("to", NVARCHAR(500), nullable=False)
    subject = Column(NVARCHAR(255), nullable=False)
    body = Column(NVARCHAR(length=None), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(Integer, nullable=True)


class UserNotification(Base):
    """Per-user notification row (tenant-scoped inbox item)."""

    __tablename__ = "user_notifications"
    __table_args__ = (
        UniqueConstraint(
            "tenant_id",
            "user_id",
            "source_key",
            name="UQ_user_notifications_source",
        ),
    )

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    module = Column(String(30), nullable=False)  # syllabus | holiday | notice | exam | general
    title = Column(NVARCHAR(255), nullable=False)
    message = Column(NVARCHAR(length=None), nullable=False)
    kind = Column(String(20), nullable=False, default="general")  # reminder | day | general
    is_read = Column(Boolean, nullable=False, default=False)
    read_at = Column(DateTime, nullable=True)
    source_key = Column(String(120), nullable=False)
    entity_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_by = Column(Integer, nullable=True)
    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(Integer, nullable=True)


class UserNotificationSettings(Base):
    """Per-user module enable/disable toggles for the notification inbox."""

    __tablename__ = "user_notification_settings"
    __table_args__ = (
        UniqueConstraint(
            "tenant_id",
            "user_id",
            name="UQ_user_notification_settings_user",
        ),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    syllabus_enabled = Column(Boolean, nullable=False, default=True)
    holiday_enabled = Column(Boolean, nullable=False, default=True)
    notice_enabled = Column(Boolean, nullable=False, default=True)
    exam_enabled = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_by = Column(Integer, nullable=True)
    updated_at = Column(DateTime, nullable=True)
    updated_by = Column(Integer, nullable=True)
