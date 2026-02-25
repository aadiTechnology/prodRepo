from datetime import datetime
from sqlalchemy import Column, Integer, String, Enum as PgEnum, DateTime, Boolean  # <-- Add DateTime, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base
from enum import Enum  # <-- Add this import

class TenantStatus(str, Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"

class Tenant(Base):
    """Tenant model for multi-tenant support."""

    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    status = Column(PgEnum(TenantStatus), nullable=False, default=TenantStatus.ACTIVE)

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
    users = relationship("User", back_populates="tenant")
    roles = relationship("Role", back_populates="tenant")
    menus = relationship("Menu", back_populates="tenant")

