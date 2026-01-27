from datetime import datetime

from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship

from app.core.database import Base


class Feature(Base):
    """Feature / permission model for RBAC."""

    __tablename__ = "features"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    code = Column(String(100), nullable=False, unique=True)  # e.g. USER_VIEW, USER_EDIT
    name = Column(String(200), nullable=False)
    description = Column(String(500), nullable=True)
    category = Column(String(100), nullable=True)  # e.g. USER, ORDER
    is_active = Column(Boolean, nullable=False, default=True)

    # Audit fields
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_by = Column(Integer, nullable=True)
    updated_at = Column(DateTime, nullable=True)
    updated_by = Column(Integer, nullable=True)

    # Soft delete
    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(Integer, nullable=True)

    # Relationships
    roles = relationship("Role", secondary="role_features", back_populates="features")

