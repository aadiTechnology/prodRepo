from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship

from app.core.database import Base


class Syllabus(Base):
    __tablename__ = "syllabus"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="NO ACTION"), nullable=False)
    academic_year_id = Column(
        Integer, ForeignKey("academic_years.id", ondelete="NO ACTION"), nullable=False
    )
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="NO ACTION"), nullable=False)
    month = Column(String(20), nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=False)
    upload_date = Column(DateTime, nullable=False, default=datetime.utcnow)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=False)
    updated_at = Column(DateTime, nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=True)
    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=True)

    academic_year = relationship("AcademicYear", foreign_keys=[academic_year_id], lazy="joined")
    class_model = relationship("SchoolClass", foreign_keys=[class_id], lazy="joined")
    uploader = relationship("User", foreign_keys=[uploaded_by], lazy="joined")
    attachments = relationship(
        "SyllabusAttachment",
        back_populates="syllabus",
        cascade="all, delete-orphan",
        lazy="select",
    )


class SyllabusAttachment(Base):
    __tablename__ = "syllabus_attachments"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="NO ACTION"), nullable=False)
    syllabus_id = Column(
        Integer, ForeignKey("syllabus.id", ondelete="CASCADE"), nullable=False
    )
    file_name = Column(NVARCHAR(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(100), nullable=True)
    file_size_kb = Column(Integer, nullable=True)
    uploaded_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    uploaded_by = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=True)
    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=True)

    syllabus = relationship("Syllabus", back_populates="attachments")
