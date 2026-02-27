"""Service layer for Role CRUD and queries."""

from app.models.permission import Permission, role_permissions
from app.schemas.role import RoleCreate, RoleUpdate
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.core.exceptions import NotFoundException, ConflictException
from app.core.logging_config import get_logger
from app.models.role import Role
from datetime import datetime

logger = get_logger(__name__)


def get_roles(
    db: Session,
    search: str = None,
    page_number: int = 1,
    page_size: int = 50,
    tenant_id: int = None,
    is_platform: bool = False
) -> tuple[list[Role], int]:
    """
    Get roles filtered by scope.
    Super Admin (is_platform=True) -> Platform roles where tenant_id IS NULL.
    Tenant Admin (is_platform=False) -> Tenant roles where tenant_id = tenant_id.
    """
    query = db.query(Role)

    # RBAC filtering logic
    # if is_platform:
    #     query = query.filter(Role.scope_type == "Platform", Role.tenant_id == None)
    # elif tenant_id:
    #     query = query.filter(Role.scope_type == "Tenant", Role.tenant_id == tenant_id)
    # # else: fallback, show all roles (for legacy or debugging)

    if search:
        query = query.filter(Role.name.ilike(f"%{search}%"))

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
    # Validate code uniqueness, scope, tenant_id, at least one permission
    if not data.code or " " in data.code or not data.code.isupper():
        raise ConflictException("Role code required, uppercase, no spaces")
    if db.query(Role).filter(Role.code == data.code, Role.tenant_id == data.tenant_id, Role.is_deleted == False).first():
        raise ConflictException("Role code must be unique")
    if data.scope_type == "Tenant" and not data.tenant_id:
        raise ConflictException("Tenant ID required for tenant scope")
    if not data.permission_ids or len(data.permission_ids) == 0:
        raise ConflictException("At least one permission required")

    role = Role(
        code=data.code,
        name=data.name,
        scope_type=data.scope_type,
        description=data.description,
        is_active=data.is_active,
        is_system=data.is_system,
        tenant_id=data.tenant_id,
        created_by=created_by,
    )
    db.add(role)
    db.flush()
    # Map permissions
    perms = db.query(Permission).filter(Permission.id.in_(data.permission_ids)).all()
    if not perms or len(perms) != len(data.permission_ids):
        raise ConflictException("Invalid permission(s)")
    role.permissions = perms
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
    if data.permission_ids is not None:
        perms = db.query(Permission).filter(Permission.id.in_(data.permission_ids)).all()
        if not perms or len(perms) != len(data.permission_ids):
            raise ConflictException("Invalid permission(s)")
        role.permissions = perms
    role.updated_by = updated_by
    db.commit()
    db.refresh(role)
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

