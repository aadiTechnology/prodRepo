"""Service helpers for RBAC assignments and login context."""

from enum import Enum
from typing import List, Tuple, Dict, Any, Optional

from sqlalchemy.orm import Session

from app.core.logging_config import get_logger
from app.core.exceptions import ValidationException, ForbiddenException
from app.models.user import User
from app.models.role import Role, user_roles, role_features, role_menus
from app.models.feature import Feature
from app.models.menu import Menu
from app.models.role_menu_permission import RoleMenuPermission
from app.schemas.menu import MenuNode
from app.schemas.rbac_mgmt import PermissionBulkUpdateRequest
from app.services import menu_service


logger = get_logger(__name__)

SYSTEM_ADMIN_ROLE_CODE = "SYSTEM_ADMIN"
TENANT_ADMIN_ROLE_CODE = "TENANT_ADMIN"


class RoleScope(str, Enum):
    PLATFORM = "PLATFORM"
    TENANT = "TENANT"
    BOTH = "BOTH"


def _include_menu_with_parents(db: Session, menu: Menu, menu_rows: List[Menu], seen_menu_ids: set[int]) -> None:
    current = menu
    while current and current.id not in seen_menu_ids:
        menu_rows.append(current)
        seen_menu_ids.add(current.id)
        if not current.parent_id:
            break
        current = db.query(Menu).get(current.parent_id)


def get_user_roles(db: Session, user_id: int) -> List[Role]:
    """Return all non-deleted roles assigned to a user."""
    return (
        db.query(Role)
        .join(user_roles, user_roles.c.role_id == Role.id)
        .filter(user_roles.c.user_id == user_id, Role.is_deleted == False)  # noqa: E712
        .all()
    )


def _validate_role_scope(role: Role, user: User, action: str) -> None:
    """Validate that a role can be assigned to a user based on scope."""
    role_scope = role.scope_type or RoleScope.TENANT
    
    if role_scope == RoleScope.PLATFORM and user.tenant_id is not None:
        raise ForbiddenException(
            f"Cannot {action} platform-level role '{role.code}' to a tenant user."
        )
    
    if role_scope == RoleScope.TENANT and user.tenant_id is None:
        raise ForbiddenException(
            f"Cannot {action} tenant-level role '{role.code}' to a platform user."
        )
    
    if role_scope == RoleScope.TENANT and role.tenant_id is not None and role.tenant_id != user.tenant_id:
        raise ForbiddenException(
            f"Cannot {action} role '{role.code}' - role belongs to a different tenant."
        )


def set_user_roles(db: Session, user: User, role_ids: List[int], acting_user_id: int | None = None) -> None:
    """Replace user roles with the given set."""
    for role_id in role_ids:
        role = db.query(Role).filter(Role.id == role_id, Role.is_deleted == False).first()
        if not role:
            raise ValidationException(f"Role with id {role_id} not found.")
        _validate_role_scope(role, user, "assign")
    
    db.execute(user_roles.delete().where(user_roles.c.user_id == user.id))

    values = [
        {"user_id": user.id, "role_id": rid}
        for rid in role_ids
    ]
    if values:
        db.execute(user_roles.insert(), values)
    db.commit()
    logger.info(f"Updated roles for user {user.email} (id={user.id}) to {role_ids}")


def _validate_menu_belongs_to_role_scope(menu: Menu, role: Role) -> None:
    """Validate that a menu can be assigned to a role based on tenant scope."""
    if menu.tenant_id is None:
        return
    
    if role.tenant_id is not None and menu.tenant_id != role.tenant_id:
        raise ForbiddenException(
            f"Cannot assign menu '{menu.name}' to role '{role.code}' - menu belongs to a different tenant."
        )
    
    if role.tenant_id is None:
        raise ForbiddenException(
            f"Cannot assign tenant-specific menu '{menu.name}' to a platform role."
        )


def _validate_feature_belongs_to_role_scope(feature: Feature, role: Role) -> None:
    """Validate that a feature can be assigned to a role based on tenant scope."""
    if feature.tenant_id is None:
        return
    
    if role.tenant_id is not None and feature.tenant_id != role.tenant_id:
        raise ForbiddenException(
            f"Cannot assign feature '{feature.code}' to role '{role.code}' - feature belongs to a different tenant."
        )
    
    if role.tenant_id is None:
        raise ForbiddenException(
            f"Cannot assign tenant-specific feature '{feature.code}' to a platform role."
        )


def set_role_menus(db: Session, role: Role, menu_ids: List[int], acting_user_id: int | None = None) -> None:
    """Replace menus assigned to a role."""
    for mid in menu_ids:
        menu = db.query(Menu).filter(Menu.id == mid, Menu.is_deleted == False).first()
        if not menu:
            raise ValidationException(f"Menu with id {mid} not found.")
        _validate_menu_belongs_to_role_scope(menu, role)
    
    db.execute(role_menus.delete().where(role_menus.c.role_id == role.id))
    values = [
        {"role_id": role.id, "menu_id": mid}
        for mid in menu_ids
    ]
    if values:
        db.execute(role_menus.insert(), values)
    db.commit()
    logger.info(f"Updated menus for role {role.code} (id={role.id}) to {menu_ids}")


def set_role_features(db: Session, role: Role, feature_ids: List[int], acting_user_id: int | None = None) -> None:
    """Replace features assigned to a role."""
    for fid in feature_ids:
        feature = db.query(Feature).filter(Feature.id == fid, Feature.is_deleted == False).first()
        if not feature:
            raise ValidationException(f"Feature with id {fid} not found.")
        _validate_feature_belongs_to_role_scope(feature, role)
    
    db.execute(role_features.delete().where(role_features.c.role_id == role.id))
    values = [
        {"role_id": role.id, "feature_id": fid}
        for fid in feature_ids
    ]
    if values:
        db.execute(role_features.insert(), values)
    db.commit()
    logger.info(f"Updated features for role {role.code} (id={role.id}) to {feature_ids}")


def resolve_user_permissions_and_menus(db: Session, user: User) -> Tuple[List[str], List[MenuNode]]:
    """
    Resolve effective permission codes and menu tree for a user, based on roles.
    Uses the new RoleMenuPermission (CRUD) architecture.
    """
    from app.models.user import UserRole
    from app.core.dependencies import SYSTEM_ADMIN_ROLE_CODE
    
    logger.info(f"[RBAC] Resolving permissions for user: {user.email} (role={user.role})")
    
    roles = get_user_roles(db, user.id)
    role_ids = [r.id for r in roles]
    role_codes = [r.code.lower() for r in roles]
    
    # Check if user is SUPER_ADMIN
    is_super_admin = (
        user.role == UserRole.SUPER_ADMIN or 
        (user.role == UserRole.ADMIN and user.tenant_id is None) or
        SYSTEM_ADMIN_ROLE_CODE.lower() in role_codes
    )
    
    permission_codes = set()
    menu_rows = []

    if is_super_admin:
        # SUPER_ADMIN gets everything
        logger.info("[RBAC] User is SUPER_ADMIN. Granting full access.")
        
        # All features with all CRUD actions
        features = db.query(Feature).filter(Feature.is_active == True, Feature.is_deleted == False).all()  # noqa: E712
        for f in features:
            for action in ["view", "create", "edit", "delete"]:
                permission_codes.add(f"{f.code}:{action}")
        
        # All menus for tenant
        menu_rows = db.query(Menu).filter(
            Menu.is_active == True,  # noqa: E712
            Menu.is_deleted == False,  # noqa: E712
        ).all()
        # Filter by tenant
        menu_rows = [m for m in menu_rows if m.tenant_id is None or m.tenant_id == user.tenant_id]
        
    elif role_ids:
        perms = (
            db.query(RoleMenuPermission)
            .join(Menu, RoleMenuPermission.menu_id == Menu.id)
            .filter(
                RoleMenuPermission.role_id.in_(role_ids),
                Menu.is_active == True,  # noqa: E712
                Menu.is_deleted == False,  # noqa: E712
            )
            .all()
        )

        seen_menu_ids: set[int] = set()
        for p in perms:
            m = p.menu
            if m.feature_id:
                f_code = m.feature.code if m.feature else None
                if f_code:
                    if p.can_view:
                        permission_codes.add(f"{f_code}:view")
                    if p.can_create:
                        permission_codes.add(f"{f_code}:create")
                    if p.can_edit:
                        permission_codes.add(f"{f_code}:edit")
                    if p.can_delete:
                        permission_codes.add(f"{f_code}:delete")

            if p.can_view and (m.tenant_id is None or m.tenant_id == user.tenant_id):
                _include_menu_with_parents(db, m, menu_rows, seen_menu_ids)

    
    logger.info(f"[RBAC] Resolved {len(permission_codes)} permission codes and {len(menu_rows)} menu rows")
    
    menu_tree = menu_service.build_menu_tree(menu_rows) if menu_rows else []
    return list(permission_codes), menu_tree


def _path_from_name(name: str) -> str:
    if not name or not name.strip():
        return ""
    return "/" + name.strip().lower().replace(" ", "-").replace("_", "-")


def _flatten_menu_tree_for_ai(nodes: List[MenuNode], parent_id: int | None, parent_name: str, out: List[Dict[str, Any]]) -> None:
    for n in nodes:
        route = (n.path or "").strip() or _path_from_name(n.name)
        out.append({
            "menu_id": n.id,
            "menu_name": n.name,
            "parent_menu_id": parent_id,
            "parent_menu_name": parent_name,
            "route": route,
        })
        if n.children:
            _flatten_menu_tree_for_ai(n.children, n.id, n.name, out)


def get_allowed_menus_tree_for_ai(db: Session, user: User) -> List[Dict[str, Any]]:
    _, menu_tree = resolve_user_permissions_and_menus(db, user)
    flat: List[Dict[str, Any]] = []
    for root in menu_tree:
        route = (root.path or "").strip() or _path_from_name(root.name)
        flat.append({
            "menu_id": root.id,
            "menu_name": root.name,
            "parent_menu_id": None,
            "parent_menu_name": "",
            "route": route,
        })
        if root.children:
            _flatten_menu_tree_for_ai(root.children, root.id, root.name, flat)
    return flat


def set_role_menu_permissions(db: Session, role: Role, data: PermissionBulkUpdateRequest, acting_user_id: int | None = None) -> None:
    """Bulk replace RoleMenuPermission records for a role."""
    from sqlalchemy.exc import IntegrityError, DataError
    
    if not data.permissions:
        raise ValidationException("Permissions list cannot be empty.")
    
    seen_menu_ids = set()
    for p in data.permissions:
        if p.menu_id in seen_menu_ids:
            raise ValidationException(f"Duplicate menu_id: {p.menu_id} found in permissions list.")
        seen_menu_ids.add(p.menu_id)
        
        menu = db.query(Menu).filter(Menu.id == p.menu_id, Menu.is_deleted == False).first()
        if not menu:
            raise ValidationException(f"Menu with id {p.menu_id} not found.")
        
        if menu.tenant_id is not None and role.tenant_id is not None:
            if menu.tenant_id != role.tenant_id:
                raise ForbiddenException(
                    f"Cannot assign permissions for menu '{menu.name}' from different tenant."
                )
        elif menu.tenant_id is not None and role.tenant_id is None:
            raise ForbiddenException(
                f"Cannot assign tenant-specific menu '{menu.name}' to a platform role."
            )
    
    try:
        db.query(RoleMenuPermission).filter(
            RoleMenuPermission.role_id == role.id
        ).delete()

        new_perms = []
        for p in data.permissions:
            if p.can_view:
                new_perms.append(RoleMenuPermission(
                    role_id=role.id,
                    tenant_id=role.tenant_id,
                    menu_id=p.menu_id,
                    can_view=p.can_view,
                    can_create=p.can_create,
                    can_edit=p.can_edit,
                    can_delete=p.can_delete,
                    created_by=acting_user_id
                ))

        if new_perms:
            db.add_all(new_perms)

        db.commit()
        logger.info(f"[RBAC] Updated {len(new_perms)} granular permissions for role {role.code} (id={role.id})")
    except (IntegrityError, DataError) as e:
        db.rollback()
        logger.error(f"[RBAC] Failed to update permissions for role {role.code} (id={role.id}): {str(e)}")
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[RBAC] Failed to update permissions for role {role.code} (id={role.id}): {str(e)}")
        raise


