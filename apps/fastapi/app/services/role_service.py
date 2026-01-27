"""Service layer for Role CRUD and queries."""

from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.exceptions import NotFoundException, ConflictException
from app.core.logging_config import get_logger
from app.models.role import Role
from app.schemas.role import RoleCreate, RoleUpdate


logger = get_logger(__name__)


def get_roles(db: Session, tenant_id: int | None = None) -> list[Role]:
    """Get roles, optionally filtered by tenant (including global roles)."""
    query = db.query(Role).filter(Role.is_deleted == False)  # noqa: E712
    if tenant_id is not None:
        query = query.filter(or_(Role.tenant_id == None, Role.tenant_id == tenant_id))  # noqa: E711
    return query.all()


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
        tenant_id=data.tenant_id,
        code=data.code,
        name=data.name,
        description=data.description,
        is_system=data.is_system,
        is_active=data.is_active,
        created_by=created_by,
    )
    db.add(role)
    db.commit()
    db.refresh(role)
    logger.info(f"Role created: {role.code} (id={role.id})")
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

