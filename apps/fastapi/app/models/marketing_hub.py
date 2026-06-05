from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.tenant import Tenant
    from app.models.user import User


class MarketingPlatform(Base):
    """Global marketing platforms catalog model."""

    __tablename__ = "marketing_platforms"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    code = Column(String(50), nullable=False, unique=True, index=True)
    description = Column(String(200), nullable=True)
    icon_url = Column(String(500), nullable=True)
    category = Column(String(50), nullable=False)
    sort_order = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)

    # Audit fields
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime, nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    links = relationship("MarketingSocialMediaLink", back_populates="platform", cascade="all, delete-orphan")


class MarketingSocialMediaLink(Base):
    """Tenant-specific URL links for marketing platforms."""

    __tablename__ = "marketing_social_media_links"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    scope_type = Column(String(20), nullable=False, default="TENANT")
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True, index=True)
    platform_id = Column(Integer, ForeignKey("marketing_platforms.id", ondelete="CASCADE"), nullable=False, index=True)
    url = Column(NVARCHAR(length=2000), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)

    # Audit fields
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime, nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    platform = relationship("MarketingPlatform", back_populates="links")
    tenant = relationship("Tenant")
