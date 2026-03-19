from datetime import datetime, timezone
from sqlalchemy import Column, Integer, ForeignKey, Boolean, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base

class RoleMenuPermission(Base):
    """
    Granular permissions for a role on a specific menu/module.
    Note: Hard-delete only design. No is_deleted column needed at this time.
    """
    __tablename__ = "role_menu_permissions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)
    menu_id = Column(Integer, ForeignKey("menus.id", ondelete="CASCADE"), nullable=False)

    can_view = Column(Boolean, nullable=False, default=False)
    can_create = Column(Boolean, nullable=False, default=False)
    can_edit = Column(Boolean, nullable=False, default=False)
    can_delete = Column(Boolean, nullable=False, default=False)

    # Audit fields
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    created_by = Column(Integer, nullable=True)
    updated_at = Column(DateTime, nullable=True, onupdate=lambda: datetime.now(timezone.utc))
    updated_by = Column(Integer, nullable=True)

    # Relationships
    role = relationship("Role", back_populates="menu_permissions")
    menu = relationship("Menu", backref="role_permissions")
    tenant = relationship("Tenant")

    __table_args__ = (
        UniqueConstraint('tenant_id', 'role_id', 'menu_id', name='uq_role_menu_permissions'),
    )
