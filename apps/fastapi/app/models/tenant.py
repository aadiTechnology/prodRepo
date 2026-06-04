from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import Column, Integer, String, Boolean, DateTime, UnicodeText, ForeignKey
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship
from app.core.database import Base
from enum import Enum

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.role import Role
    from app.models.menu import Menu

class TenantStatus(str, Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"

class Tenant(Base):
    """Tenant model for multi-tenant support."""

    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    code = Column(String(50), nullable=False, unique=True, index=True)
    name = Column(String(200), nullable=False)
    owner_name = Column(String(150), nullable=True)
    email = Column(String(150), nullable=True)
    phone = Column(String(20), nullable=True)
    description = Column(String(500), nullable=True)

    # Branding
    logo_url = Column(NVARCHAR(length=None), nullable=True)  # Correct way to specify NVARCHAR(MAX) in mssql dialect
    theme_template_id = Column(Integer, ForeignKey("theme_templates.id", ondelete="SET NULL"), nullable=True, index=True)  # Optional link to Theme Template for token overrides

    # Address
    address_line1 = Column(String(200), nullable=True)
    address_line2 = Column(String(200), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    pin_code = Column(String(20), nullable=True)

    # Login URL host for tenant-specific login (e.g. tenant1.myapp.com); unique when set
    login_url = Column(String(253), nullable=True, unique=True, index=True)

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
    users = relationship("User", back_populates="tenant")
    roles = relationship("Role", back_populates="tenant")
    menus = relationship("Menu", back_populates="tenant")
    theme_template = relationship("ThemeTemplate", foreign_keys=[theme_template_id])

