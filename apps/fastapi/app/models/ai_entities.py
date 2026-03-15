from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class Requirement(Base):
    __tablename__ = "requirements"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    requirement_hash = Column(String(64), nullable=True, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=False)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="SET NULL"), nullable=True)
    is_super_admin_accessible = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_by = Column(Integer, nullable=True)
    updated_at = Column(DateTime, nullable=True)
    updated_by = Column(Integer, nullable=True)

    user_stories = relationship("UserStory", back_populates="requirement", cascade="all, delete-orphan")


REVIEW_STATUS_DRAFT = "draft"
REVIEW_STATUS_APPROVED = "approved"
REVIEW_STATUS_REJECTED = "rejected"


class UserStory(Base):
    __tablename__ = "user_stories"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    requirement_id = Column(Integer, ForeignKey("requirements.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(500), nullable=False)
    prerequisite = Column(JSON, nullable=True)
    story = Column(Text, nullable=False)
    acceptance_criteria = Column(JSON, nullable=True)
    review_status = Column(String(20), nullable=False, default=REVIEW_STATUS_DRAFT)
    rejection_reason = Column(Text, nullable=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="SET NULL"), nullable=True)
    is_super_admin_accessible = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_by = Column(Integer, nullable=True)
    updated_at = Column(DateTime, nullable=True)
    updated_by = Column(Integer, nullable=True)

    requirement = relationship("Requirement", back_populates="user_stories")
    test_cases = relationship("TestCase", back_populates="user_story", cascade="all, delete-orphan")
    development_tasks = relationship(
        "DevelopmentTask", back_populates="user_story", cascade="all, delete-orphan"
    )


class TestCase(Base):
    __tablename__ = "test_cases"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_story_id = Column(Integer, ForeignKey("user_stories.id", ondelete="CASCADE"), nullable=False)
    test_case_id = Column(String(100), nullable=False)
    scenario = Column(String(1000), nullable=False)
    review_status = Column(String(20), nullable=False, default=REVIEW_STATUS_DRAFT)
    rejection_reason = Column(Text, nullable=True)
    pre_requisite = Column(JSON, nullable=True)
    test_data = Column(JSON, nullable=True)
    steps = Column(JSON, nullable=True)
    expected_result = Column(Text, nullable=False)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="SET NULL"), nullable=True)
    is_super_admin_accessible = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_by = Column(Integer, nullable=True)
    updated_at = Column(DateTime, nullable=True)
    updated_by = Column(Integer, nullable=True)

    user_story = relationship("UserStory", back_populates="test_cases")


class DevelopmentTask(Base):
    __tablename__ = "development_tasks"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_story_id = Column(Integer, ForeignKey("user_stories.id", ondelete="CASCADE"), nullable=False)
    task_id = Column(String(50), nullable=False)  # e.g. FRONT-101, BACK-102
    category = Column(String(20), nullable=False)  # frontend, backend, database, testing
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=False)
    related_scenario = Column(String(500), nullable=False)
    component = Column(String(200), nullable=False)
    priority = Column(String(20), nullable=False)
    estimated_effort = Column(String(50), nullable=False)
    depends_on_task_id = Column(String(50), nullable=True)  # task_id of predecessor (e.g. DB-101)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_by = Column(Integer, nullable=True)

    user_story = relationship("UserStory", back_populates="development_tasks")
