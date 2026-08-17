from datetime import date, datetime

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship

from app.core.database import Base


class SupportQuery(Base):
    __tablename__ = "support_queries"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="NO ACTION"), nullable=False)
    query_ref = Column(String(20), nullable=False)
    category = Column(NVARCHAR(100), nullable=False)
    subject = Column(NVARCHAR(500), nullable=False)
    description = Column(NVARCHAR(length=None), nullable=False)
    status = Column(String(20), nullable=False)
    created_by_role = Column(String(20), nullable=False)
    attachment_file_name = Column(NVARCHAR(255), nullable=True)
    attachment_file_path = Column(String(500), nullable=True)
    attachment_file_type = Column(String(20), nullable=True)
    attachment_file_size_kb = Column(Integer, nullable=True)
    forwarded_to_super_admin = Column(Boolean, nullable=False, default=False)
    forwarded_by = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=True)
    forwarded_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=False)
    updated_at = Column(DateTime, nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=True)
    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=True)

    messages = relationship(
        "SupportQueryMessage",
        back_populates="query",
        cascade="all, delete-orphan",
        lazy="select",
        order_by="SupportQueryMessage.created_at.asc()",
    )


class SupportQueryMessage(Base):
    __tablename__ = "support_query_messages"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="NO ACTION"), nullable=False)
    query_id = Column(Integer, ForeignKey("support_queries.id", ondelete="NO ACTION"), nullable=False)
    author_user_id = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=False)
    author_role = Column(String(20), nullable=False)
    body = Column(NVARCHAR(length=None), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    query = relationship("SupportQuery", back_populates="messages")


class SupportQueryRead(Base):
    __tablename__ = "support_query_reads"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="NO ACTION"), nullable=False)
    query_id = Column(Integer, ForeignKey("support_queries.id", ondelete="NO ACTION"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=False)
    read_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class SupportReleaseNote(Base):
    __tablename__ = "support_release_notes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(NVARCHAR(255), nullable=False)
    version = Column(String(50), nullable=False)
    release_date = Column(Date, nullable=False)
    description = Column(NVARCHAR(length=None), nullable=False)
    status = Column(String(20), nullable=False)
    show_to_admin = Column(Boolean, nullable=False, default=True)
    show_to_teacher = Column(Boolean, nullable=False, default=True)
    show_to_student = Column(Boolean, nullable=False, default=True)
    file_name = Column(NVARCHAR(255), nullable=True)
    file_path = Column(String(500), nullable=True)
    file_type = Column(String(20), nullable=True)
    file_size_kb = Column(Integer, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=False)
    updated_at = Column(DateTime, nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=True)
    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=True)
