from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.mssql import NVARCHAR

from app.core.database import Base


class Notice(Base):
    __tablename__ = "communication_notices"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="NO ACTION"), nullable=False)
    title = Column(NVARCHAR(255), nullable=False)
    description = Column(NVARCHAR(length=None), nullable=False)
    notice_type = Column(String(30), nullable=False)
    audience_type = Column(String(30), nullable=False)
    status = Column(String(20), nullable=False, default="DRAFT")
    publish_date = Column(DateTime, nullable=False)
    expiry_date = Column(DateTime, nullable=True)
    is_published = Column(Boolean, nullable=False, default=False)
    published_at = Column(DateTime, nullable=True)
    unpublished_at = Column(DateTime, nullable=True)
    send_notification = Column(Boolean, nullable=False, default=False)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_by = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=True)
    updated_at = Column(DateTime, nullable=True)
    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=True)


class NoticeTarget(Base):
    __tablename__ = "communication_notice_targets"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="NO ACTION"), nullable=False)
    notice_id = Column(Integer, ForeignKey("communication_notices.id", ondelete="CASCADE"), nullable=False)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="NO ACTION"), nullable=True)
    division_id = Column(Integer, ForeignKey("class_divisions.id", ondelete="NO ACTION"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=True)
    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=True)


class NoticeAttachment(Base):
    __tablename__ = "communication_notice_attachments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="NO ACTION"), nullable=False)
    notice_id = Column(Integer, ForeignKey("communication_notices.id", ondelete="CASCADE"), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=False)
    file_size_kb = Column(Integer, nullable=True)
    uploaded_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    uploaded_by = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=True)
    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=True)
