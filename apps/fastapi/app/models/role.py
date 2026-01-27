from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    Table,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


# Association table: user <-> role (many-to-many)
user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("assigned_at", DateTime, nullable=False, default=datetime.utcnow),
    Column("assigned_by", Integer, nullable=True),
)


# Association table: role <-> feature (many-to-many)
role_features = Table(
    "role_features",
    Base.metadata,
    Column("role_id", Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("feature_id", Integer, ForeignKey("features.id", ondelete="CASCADE"), primary_key=True),
    Column("granted_at", DateTime, nullable=False, default=datetime.utcnow),
    Column("granted_by", Integer, nullable=True),
)


# Association table: role <-> menu (many-to-many)
role_menus = Table(
    "role_menus",
    Base.metadata,
    Column("role_id", Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("menu_id", Integer, ForeignKey("menus.id", ondelete="CASCADE"), primary_key=True),
    Column("granted_at", DateTime, nullable=False, default=datetime.utcnow),
    Column("granted_by", Integer, nullable=True),
)


class Role(Base):
    """Role model for RBAC."""

    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="SET NULL"), nullable=True)

    code = Column(String(50), nullable=False)  # e.g. SUPER_ADMIN, ADMIN, USER
    name = Column(String(150), nullable=False)
    description = Column(String(500), nullable=True)
    is_system = Column(Boolean, nullable=False, default=False)
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
    tenant = relationship("Tenant", back_populates="roles")
    users = relationship("User", secondary=user_roles, back_populates="roles")
    features = relationship("Feature", secondary=role_features, back_populates="roles")
    menus = relationship("Menu", secondary=role_menus, back_populates="roles")

    __table_args__ = (
        # Ensure role code is unique within a tenant; allow global roles (tenant_id NULL)
        # Note: For MSSQL, a filtered unique index is usually added via migration.
        {},
    )

