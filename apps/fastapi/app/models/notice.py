from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text

from app.core.database import Base


class Notice(Base):
    __tablename__ = "notices"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="NO ACTION"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    notice_type = Column(String(50), nullable=False)
    audience_type = Column(String(20), nullable=False)
    publish_date = Column(DateTime, nullable=False)
    expiry_date = Column(DateTime, nullable=True)
    is_draft = Column(Boolean, nullable=False, default=True)
    is_published = Column(Boolean, nullable=False, default=False)
    send_notification = Column(Boolean, nullable=False, default=False)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_by = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=True)
    updated_at = Column(DateTime, nullable=True)
    is_deleted = Column(Boolean, nullable=False, default=False)


class NoticeTarget(Base):
    __tablename__ = "notice_targets"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    notice_id = Column(Integer, ForeignKey("notices.id", ondelete="CASCADE"), nullable=False)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="NO ACTION"), nullable=True)
    division_id = Column(Integer, ForeignKey("class_divisions.id", ondelete="NO ACTION"), nullable=True)


class NoticeAttachment(Base):
    __tablename__ = "notice_attachments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    notice_id = Column(Integer, ForeignKey("notices.id", ondelete="CASCADE"), nullable=False)
    file_name = Column(String(255), nullable=True)
    file_path = Column(String(500), nullable=True)
    file_type = Column(String(50), nullable=True)
    uploaded_at = Column(DateTime, nullable=True, default=datetime.utcnow)
