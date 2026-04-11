from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Date, Time,
    Text, ForeignKey, Index
)
from sqlalchemy.orm import relationship as sa_relationship
from app.core.database import Base


class Parent(Base):
    __tablename__ = "parents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    parent_name = Column(String(200), nullable=False)
    mobile_number = Column(String(15), nullable=False)
    alternate_mobile = Column(String(15), nullable=True)
    email = Column(String(100), nullable=True)
    address = Column(String(500), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    pin_code = Column(String(10), nullable=True)
    society = Column(String(200), nullable=True)
    relationship = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime, nullable=True, onupdate=datetime.utcnow)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    leads = sa_relationship("Lead", back_populates="parent", foreign_keys="Lead.parent_id")


class LeadSource(Base):
    __tablename__ = "lead_sources"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(50), nullable=False, unique=True)
    description = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime, nullable=True, onupdate=datetime.utcnow)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    leads = sa_relationship("Lead", back_populates="source")


class LeadStatus(Base):
    __tablename__ = "lead_statuses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(50), nullable=False, unique=True)
    sequence_order = Column(Integer, nullable=False, default=0)
    color_code = Column(String(20), nullable=True)
    is_terminal = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime, nullable=True, onupdate=datetime.utcnow)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    leads = sa_relationship("Lead", back_populates="status")


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    lead_code = Column(String(50), nullable=False)
    parent_id = Column(Integer, ForeignKey("parents.id"), nullable=False, index=True)
    child_name = Column(String(150), nullable=False)
    child_dob = Column(Date, nullable=True)
    child_gender = Column(String(10), nullable=True)
    lead_source_id = Column(Integer, ForeignKey("lead_sources.id"), nullable=False)
    lead_status_id = Column(Integer, ForeignKey("lead_statuses.id"), nullable=False)
    preferred_class_id = Column(Integer, ForeignKey("classes.id"), nullable=True)
    preferred_academic_year_id = Column(Integer, ForeignKey("academic_years.id"), nullable=True)
    expected_admission_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    remarks = Column(Text, nullable=True)
    converted_to_student_id = Column(Integer, ForeignKey("students.id"), nullable=True)
    converted_at = Column(DateTime, nullable=True)
    converted_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    next_followup_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime, nullable=True, onupdate=datetime.utcnow)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    parent = sa_relationship("Parent", back_populates="leads", foreign_keys=[parent_id])
    source = sa_relationship("LeadSource", back_populates="leads", foreign_keys=[lead_source_id])
    status = sa_relationship("LeadStatus", back_populates="leads", foreign_keys=[lead_status_id])
    followups = sa_relationship("LeadFollowup", back_populates="lead", cascade="all, delete-orphan")


class LeadFollowup(Base):
    __tablename__ = "lead_followups"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False, index=True)
    followup_date = Column(Date, nullable=False)
    followup_time = Column(Time, nullable=True)
    followup_type = Column(String(20), nullable=False)  # Call, Visit, Email, WhatsApp
    followup_notes = Column(Text, nullable=True)
    followup_status = Column(String(20), nullable=False, default="Pending")  # Pending, Completed, Cancelled
    completed_at = Column(DateTime, nullable=True)
    completed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    completion_notes = Column(Text, nullable=True)
    next_followup_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime, nullable=True, onupdate=datetime.utcnow)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    lead = sa_relationship("Lead", back_populates="followups")
