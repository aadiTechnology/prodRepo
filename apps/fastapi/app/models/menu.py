from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    ForeignKey,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class Menu(Base):
    """Menu model supporting a 2-level hierarchy."""

    __tablename__ = "menus"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="SET NULL"), nullable=True)
    parent_id = Column(Integer, ForeignKey("menus.id", ondelete="SET NULL"), nullable=True)

    name = Column(String(150), nullable=False)
    path = Column(String(300), nullable=True)  # e.g. /users
    icon = Column(String(100), nullable=True)
    sort_order = Column(Integer, nullable=False, default=0)
    level = Column(Integer, nullable=False)  # 1 or 2
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
    tenant = relationship("Tenant", back_populates="menus")
    parent = relationship("Menu", remote_side=[id], backref="children")
    roles = relationship("Role", secondary="role_menus", back_populates="menus")

