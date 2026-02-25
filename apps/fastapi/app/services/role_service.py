"""Service layer for Role CRUD and queries."""

from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.core.exceptions import NotFoundException, ConflictException
from app.core.logging_config import get_logger
from app.models.role import Role
from app.schemas.role import RoleCreate, RoleUpdate
from datetime import datetime

logger = get_logger(__name__)


def get_roles(db: Session, search: str = None, page_number: int = 1, page_size: int = 10, tenant_id: str = None) -> list[Role]:
    """Get roles, optionally filtered by tenant (including global roles)."""
    query = db.query(Role).filter(Role.is_deleted == False)
    if search:
        query = query.filter(Role.name.ilike(f"%{search}%"))
    if tenant_id:
        query = query.filter(or_(Role.tenant_id == None, Role.tenant_id == tenant_id))
    total_count = query.count()
    roles = (
        query.order_by(Role.created_at.desc())
        .offset((page_number - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return roles, total_count


def get_role(db: Session, role_id: int) -> Role:
    """Get a single role by ID."""
    role = db.query(Role).filter(Role.id == role_id, Role.is_deleted == False).first()  # noqa: E712
    if not role:
        raise NotFoundException("Role", role_id)
    return role


def create_role(db: Session, data: RoleCreate, created_by: int | None = None) -> Role:
    """Create a new role."""
    # Ensure code uniqueness per tenant (including NULL)
    existing = (
        db.query(Role)
        .filter(
            Role.code == data.code,
            Role.tenant_id == data.tenant_id,
            Role.is_deleted == False,  # noqa: E712
        )
        .first()
    )
    if existing:
        raise ConflictException(f"Role with code '{data.code}' already exists for this tenant")

    role = Role(
        name=data.name,
        scope_type=data.scope_type,
        description=data.description,
        is_system=data.is_system,
        is_active=data.is_active,
        created_by=created_by,
        tenant_id=data.tenant_id,
        code=data.code,
    )
    db.add(role)
    db.commit()
    db.refresh(role)
    return role


def update_role(db: Session, role_id: int, data: RoleUpdate, updated_by: int | None = None) -> Role:
    """Update an existing role."""
    role = get_role(db, role_id)

    if data.name is not None:
        role.name = data.name
    if data.description is not None:
        role.description = data.description
    if data.is_active is not None:
        role.is_active = data.is_active

    role.updated_by = updated_by
    db.commit()
    db.refresh(role)
    logger.info(f"Role updated: {role.code} (id={role.id})")
    return role


def soft_delete_role(db: Session, role_id: int, deleted_by: int | None = None) -> None:
    """Soft delete a role."""
    role = get_role(db, role_id)
    role.is_deleted = True
    role.deleted_by = deleted_by
    db.commit()
    logger.info(f"Role soft-deleted: {role.code} (id={role.id})")


def activate_role(db: Session, role_id: str, updated_by: str) -> Role:
    """Activate a role."""
    role = get_role(db, role_id)
    if role.is_system:
        raise ConflictException("System roles cannot be deactivated.")
    role.is_active = True
    role.updated_at = datetime.utcnow()
    role.updated_by = updated_by
    db.commit()
    return role


def deactivate_role(db: Session, role_id: str, updated_by: str) -> Role:
    """Deactivate a role."""
    role = get_role(db, role_id)
    if role.is_system:
        raise ConflictException("System roles cannot be deactivated.")
    role.is_active = False
    role.updated_at = datetime.utcnow()
    role.updated_by = updated_by
    db.commit()
    return role

