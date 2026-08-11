from datetime import date, datetime

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, String, Text

from app.core.database import Base


class SupportFaq(Base):
    __tablename__ = "support_faqs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="NO ACTION"), nullable=False)
    title = Column(String(255), nullable=False)
    question = Column(String(1000), nullable=False)
    answer = Column(Text, nullable=False)
    module_name = Column(String(100), nullable=False)
    category_id = Column(String(100), nullable=False)
    category_path = Column(String(255), nullable=False)
    status = Column(String(20), nullable=False)
    owner = Column(String(100), nullable=False)
    language = Column(String(20), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=False)
    updated_at = Column(DateTime, nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=True)
    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=True)


class SupportFaqAttachment(Base):
    __tablename__ = "support_faq_attachments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="NO ACTION"), nullable=False)
    faq_id = Column(Integer, ForeignKey("support_faqs.id", ondelete="NO ACTION"), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=False)
    file_size_kb = Column(Integer, nullable=True)
    uploaded_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    uploaded_by = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=True)
    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=True)


class SupportFaqFeedback(Base):
    __tablename__ = "support_faq_feedback"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    faq_id = Column(Integer, ForeignKey("support_faqs.id", ondelete="NO ACTION"), nullable=False)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="NO ACTION"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=False)
    is_helpful = Column(Boolean, nullable=False)
    comment = Column(String(2000), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class SupportProductUpdate(Base):
    __tablename__ = "support_product_updates"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    version = Column(String(50), nullable=False)
    release_date = Column(Date, nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String(20), nullable=False)
    file_name = Column(String(255), nullable=True)
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
