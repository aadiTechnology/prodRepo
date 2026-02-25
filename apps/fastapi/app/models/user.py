from datetime import datetime
import enum

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Boolean,
    TypeDecorator,
    ForeignKey,
)
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.role import user_roles


class UserRole(str, enum.Enum):
    """Legacy user role enumeration used by existing auth logic."""

    USER = "user"
    ADMIN = "admin"
    SUPER_ADMIN = "SUPER_ADMIN"  # System administrator role


class UserRoleType(TypeDecorator):
    """Custom type to handle UserRole enum conversion."""

    impl = String
    cache_ok = True

    def __init__(self) -> None:
        super().__init__(length=20)

    def process_bind_param(self, value, dialect):
        """Convert enum to string value when writing to database."""
        if value is None:
            return None
        if isinstance(value, UserRole):
            return value.value
        return value

    def process_result_value(self, value, dialect):
        """Convert string value to enum when reading from database."""
        if value is None:
            return None
        if isinstance(value, str):
            # Handle SUPER_ADMIN directly (exact match)
            if value == "SUPER_ADMIN":
                return UserRole.SUPER_ADMIN
            # Try to find enum by value
            for role in UserRole:
                if role.value == value:
                    return role
            # Fallback: try to find by name (uppercase)
            try:
                return UserRole[value.upper()]
            except KeyError:
                return UserRole.USER  # Default fallback
        return value


class User(Base):
    """User model extended for RBAC and multi-tenant support."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="SET NULL"), nullable=True)

    email = Column(String(150), unique=True, nullable=False)
    full_name = Column(String(150), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    phone_number = Column(String(20), nullable=True)

    # Legacy simple role field (kept to avoid breaking existing auth logic)
    role = Column(UserRoleType(), default=UserRole.USER, nullable=False)

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
    tenant = relationship("Tenant", back_populates="users")
    roles = relationship("Role", secondary=user_roles, back_populates="users")
