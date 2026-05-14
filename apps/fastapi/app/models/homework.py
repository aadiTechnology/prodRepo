from datetime import datetime
from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, String, Boolean, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class Homework(Base):
    __tablename__ = "homework"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)

    teacher_id = Column(Integer, ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False)
    class_division_id = Column(Integer, ForeignKey("class_divisions.id", ondelete="SET NULL"), nullable=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False)

    title = Column(String(255), nullable=False)
    instructions = Column(Text, nullable=True)

    assigned_date = Column(Date, nullable=False)
    submission_date = Column(Date, nullable=False)

    # Draft | Published
    status = Column(String(20), nullable=False, default="Draft")
    notify_parents = Column(Boolean, nullable=False, default=False)

    published_at = Column(DateTime, nullable=True)
    published_by = Column(Integer, nullable=True)

    # Audit / soft-delete
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_by = Column(Integer, nullable=True)
    updated_at = Column(DateTime, nullable=True)
    updated_by = Column(Integer, nullable=True)
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(Integer, nullable=True)

    # Relationships
    teacher = relationship("Teacher", foreign_keys=[teacher_id], lazy="joined")
    class_model = relationship("SchoolClass", foreign_keys=[class_id], lazy="joined")
    division = relationship("ClassDivision", foreign_keys=[class_division_id], lazy="joined")
    subject = relationship("Subject", foreign_keys=[subject_id], lazy="joined")
    academic_year = relationship("AcademicYear", foreign_keys=[academic_year_id], lazy="joined")
    attachments = relationship(
        "HomeworkAttachment",
        back_populates="homework",
        cascade="all, delete-orphan",
        lazy="select",
    )


class HomeworkAttachment(Base):
    __tablename__ = "homework_attachments"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    homework_id = Column(Integer, ForeignKey("homework.id", ondelete="CASCADE"), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=True)
    file_size_kb = Column(Integer, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    uploaded_by = Column(Integer, nullable=True)

    homework = relationship("Homework", back_populates="attachments")
