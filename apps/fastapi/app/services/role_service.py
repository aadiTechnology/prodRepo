"""Service layer for Role CRUD and queries."""

from app.schemas.role import RoleCreate, RoleUpdate  # type: ignore
from sqlalchemy.orm import Session  # type: ignore
from sqlalchemy import and_  # type: ignore
from typing import Optional

from app.core.exceptions import NotFoundException, ConflictException  # type: ignore
from app.core.logging_config import get_logger  # type: ignore
from app.models.role import Role, role_features, role_menus  # type: ignore
from app.models.feature import Feature  # type: ignore
from app.models.menu import Menu  # type: ignore
from datetime import datetime

logger = get_logger(__name__)


def get_roles(
    db: Session,
    search: Optional[str] = None,
    page_number: int = 1,
    page_size: int = 50,
    tenant_id: Optional[int] = None,
    is_platform: bool = False,
    created_from: Optional[datetime] = None,
    created_to: Optional[datetime] = None,
    sort_by: str = "id",
    sort_order: str = "desc"
) -> tuple[list[Role], int]:

    """
    Get roles filtered by scope.
    System Admin (is_platform=True) -> ALL roles (Platform AND all Tenant roles).
    Tenant Admin (is_platform=False) -> Tenant roles where tenant_id = tenant_id.
    """
    try:
        query = db.query(Role).filter(Role.is_deleted == False)

        # RBAC filtering logic
        if is_platform:
            # System Admin sees ALL roles (both Platform and Tenant scope)
            pass  # No filtering, return all roles
        elif tenant_id is not None:
            # Tenant Admin sees roles belonging to their tenant
            query = query.filter(Role.tenant_id == tenant_id)
        # else: fallback, show all roles (for legacy or debugging)

        if search:
            query = query.filter(Role.name.ilike(f"%{search}%"))

        if created_from:
            query = query.filter(Role.created_at >= created_from)
        if created_to:
            query = query.filter(Role.created_at <= created_to)

        # Robust sort_by mapping (support camelCase and snake_case)
        sort_map = {
            'name': 'name',
            'created_at': 'created_at',
            'createdAt': 'created_at',
            'id': 'id',
        }
        sort_attr = sort_map.get(sort_by, 'id')
        sort_column = getattr(Role, sort_attr, None)
        if sort_column is not None:
            if sort_order == "asc":
                query = query.order_by(sort_column.asc())
            else:
                query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(Role.id.desc())

        # Get count before pagination
        total_count = query.count()

        # Get paginated results
        roles = (
            query
            .offset((page_number - 1) * page_size)
            .limit(page_size)
            .all()
        )
        logger.info(f"Returning roles for page {page_number}, page_size {page_size}: {[r.id for r in roles]}")
        return roles, total_count
    except Exception as e:
        logger.error(f"Error fetching roles: {str(e)}")
        # Return empty list instead of crashing
        return [], 0


def get_role(db: Session, role_id: int, tenant_id: Optional[int] = None) -> Role:
    """Get a single role by ID with eager loading of permissions, optionally filtered by tenant."""
    from sqlalchemy.orm import joinedload  # type: ignore
    query = db.query(Role).filter(Role.id == role_id, Role.is_deleted == False)
    
    if tenant_id is not None:
        query = query.filter(Role.tenant_id == tenant_id)
        
    role = query.options(joinedload(Role.permissions)).first()

    if not role:
        raise NotFoundException("Role", role_id)
    return role


def create_role(db: Session, data: RoleCreate, created_by: int | None = None) -> Role:
    """Create a new role."""
    # Validate code uniqueness, scope, tenant_id
    if not data.code or " " in data.code or not data.code.isupper():
        raise ConflictException("Role code required, uppercase, no spaces")
    if db.query(Role).filter(Role.code == data.code, Role.tenant_id == data.tenant_id, Role.is_deleted == False).first():
        raise ConflictException("Role code must be unique")
    if data.scope_type == "Tenant" and not data.tenant_id:
        raise ConflictException("Tenant ID required for tenant scope")
    if data.scope_type == "Platform" and data.tenant_id is not None:
        raise ConflictException("Platform role cannot have tenant_id")

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
    
    # Map features
    if data.feature_ids:
        features = db.query(Feature).filter(Feature.id.in_(data.feature_ids)).all()
        if len(features) != len(data.feature_ids):
            raise ConflictException("One or more feature IDs are invalid")
        role.features = features
        
    # Map menus
    if data.menu_ids:
        menus = db.query(Menu).filter(Menu.id.in_(data.menu_ids)).all()
        if len(menus) != len(data.menu_ids):
            raise ConflictException("One or more menu IDs are invalid")
        role.menus = menus
        
    db.commit()
    db.refresh(role)
    return role


def update_role(db: Session, role_id: int, data: RoleUpdate, updated_by: int | None = None, tenant_id: Optional[int] = None) -> Role:
    """Update an existing role with ownership check."""
    role = get_role(db, role_id, tenant_id=tenant_id)
    if data.name is not None:
        role.name = data.name  # type: ignore
    if data.description is not None:
        role.description = data.description  # type: ignore
    if data.is_active is not None:
        role.is_active = data.is_active  # type: ignore
        
    if data.feature_ids is not None:
        features = db.query(Feature).filter(Feature.id.in_(data.feature_ids)).all()
        if len(features) != len(data.feature_ids):
            raise ConflictException("One or more feature IDs are invalid")
        role.features = features
        
    if data.menu_ids is not None:
        menus = db.query(Menu).filter(Menu.id.in_(data.menu_ids)).all()
        if len(menus) != len(data.menu_ids):
            raise ConflictException("One or more menu IDs are invalid")
        role.menus = menus
        
    role.updated_by = updated_by  # type: ignore
    role.updated_at = datetime.utcnow()  # type: ignore
    db.commit()
    db.refresh(role)
    return role



def soft_delete_role(db: Session, role_id: int, deleted_by: int | None = None, tenant_id: Optional[int] = None) -> None:
    """Soft delete a role with ownership check."""
    role = get_role(db, role_id, tenant_id=tenant_id)
    role.is_deleted = True  # type: ignore
    role.deleted_by = deleted_by  # type: ignore
    db.commit()
    logger.info(f"Role soft-deleted: {role.code} (id={role.id})")



def activate_role(db: Session, role_id: int, updated_by: int | None, tenant_id: Optional[int] = None) -> Role:
    """Activate a role with ownership check."""
    role = get_role(db, role_id, tenant_id=tenant_id)
    if role.is_system:  # type: ignore
        raise ConflictException("System roles cannot be activated or deactivated.")
    role.is_active = True  # type: ignore
    role.updated_at = datetime.utcnow()  # type: ignore
    role.updated_by = updated_by  # type: ignore
    db.commit()
    return role



def deactivate_role(db: Session, role_id: int, updated_by: int | None, tenant_id: Optional[int] = None) -> Role:
    """Deactivate a role with ownership check."""
    role = get_role(db, role_id, tenant_id=tenant_id)
    if role.is_system:  # type: ignore
        raise ConflictException("System roles cannot be deactivated.")
    role.is_active = False  # type: ignore
    role.updated_at = datetime.utcnow()  # type: ignore
    role.updated_by = updated_by  # type: ignore
    db.commit()
    return role

