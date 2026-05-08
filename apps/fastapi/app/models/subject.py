from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base

class Subject(Base):
    __tablename__ = "subjects"
    __table_args__ = (
        UniqueConstraint('tenant_id', 'code', name='uq_subjects_tenant_code'),
        {'extend_existing': True}
    )

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    code = Column(String(20), nullable=False)
    description = Column(String(500), nullable=True)
    subject_type = Column(String(50), nullable=False, default="Theory")
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="SET NULL"), nullable=True) # Legacy
    is_active = Column(Boolean, default=True, nullable=False)

    # Audit fields
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    subject_classes = relationship("SubjectClass", back_populates="subject", cascade="all, delete-orphan")


class SubjectClass(Base):
    __tablename__ = "subject_classes"
    __table_args__ = (
        UniqueConstraint('tenant_id', 'subject_id', 'class_id', name='uq_subject_classes_mapping'),
        {'extend_existing': True}
    )

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="NO ACTION"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="NO ACTION"), nullable=False)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="NO ACTION"), nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_by = Column(Integer, nullable=True)

    # Relationships
    subject = relationship("Subject", back_populates="subject_classes")
    class_model = relationship("SchoolClass", foreign_keys=[class_id], viewonly=True)
