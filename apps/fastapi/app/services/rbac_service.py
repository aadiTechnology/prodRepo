"""Service helpers for RBAC assignments and login context."""

from typing import List, Tuple, Dict, Any

from sqlalchemy.orm import Session

from app.core.logging_config import get_logger
from app.models.user import User
from app.models.role import Role, user_roles, role_features, role_menus
from app.models.feature import Feature
from app.models.menu import Menu
from app.schemas.menu import MenuNode
from app.services import menu_service


logger = get_logger(__name__)


def get_user_roles(db: Session, user_id: int) -> List[Role]:
    """Return all non-deleted roles assigned to a user."""
    return (
        db.query(Role)
        .join(user_roles, user_roles.c.role_id == Role.id)
        .filter(user_roles.c.user_id == user_id, Role.is_deleted == False)  # noqa: E712
        .all()
    )


def set_user_roles(db: Session, user: User, role_ids: List[int], acting_user_id: int | None = None) -> None:
    """Replace user roles with the given set."""
    # Clear existing
    db.execute(user_roles.delete().where(user_roles.c.user_id == user.id))

    # Insert new
    values = [
        {"user_id": user.id, "role_id": rid}
        for rid in role_ids
    ]
    if values:
        db.execute(user_roles.insert(), values)
    db.commit()
    logger.info(f"Updated roles for user {user.email} (id={user.id}) to {role_ids}")


def set_role_menus(db: Session, role: Role, menu_ids: List[int], acting_user_id: int | None = None) -> None:
    """Replace menus assigned to a role."""
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
    SUPER_ADMIN users get all features and menus automatically.
    """
    from app.models.user import UserRole
    from app.core.dependencies import SYSTEM_ADMIN_ROLE_CODE
    
    logger.info(f"[RBAC] Resolving permissions for user: {user.email} (role={user.role}, tenant_id={user.tenant_id})")
    
    roles = get_user_roles(db, user.id)
    role_ids = [r.id for r in roles]
    role_codes = [r.code.lower() for r in roles]
    
    logger.info(f"[RBAC] User has roles: {role_codes}")
    
    # Check if user is SUPER_ADMIN
    is_super_admin = (
        user.role == UserRole.SUPER_ADMIN or 
        (user.role == UserRole.ADMIN and user.tenant_id is None) or
        SYSTEM_ADMIN_ROLE_CODE.lower() in role_codes
    )
    
    logger.info(f"[RBAC] is_super_admin={is_super_admin}")
    
    # Resolve feature codes
    if is_super_admin:
        # Grant all active features to SUPER_ADMIN
        features = db.query(Feature).filter(
            Feature.is_deleted == False,  # noqa: E712
            Feature.is_active == True,  # noqa: E712
        ).all()
    elif role_ids:
        features = (
            db.query(Feature)
            .join(role_features, role_features.c.feature_id == Feature.id)
            .filter(
                role_features.c.role_id.in_(role_ids),
                Feature.is_deleted == False,  # noqa: E712
                Feature.is_active == True,  # noqa: E712
            )
            .distinct()
            .all()
        )
    else:
        features = []
    
    feature_codes = [f.code for f in features]
    
    # Resolve menus
    if is_super_admin:
        # Grant all active menus to SUPER_ADMIN (filter by tenant if applicable)
        menu_rows = db.query(Menu).filter(
            Menu.is_deleted == False,  # noqa: E712
            Menu.is_active == True,  # noqa: E712
        ).all()
        logger.info(f"[RBAC] SUPER_ADMIN: Found {len(menu_rows)} active menus before tenant filter")
        
        # Filter by tenant (global menus + user's tenant menus)
        menu_rows = [
            m for m in menu_rows
            if m.tenant_id is None or m.tenant_id == user.tenant_id
        ]
        logger.info(f"[RBAC] SUPER_ADMIN: After tenant filter: {len(menu_rows)} menus")
    elif role_ids:
        menu_rows = (
            db.query(Menu)
            .join(role_menus, role_menus.c.menu_id == Menu.id)
            .filter(
                role_menus.c.role_id.in_(role_ids),
                Menu.is_deleted == False,  # noqa: E712
                Menu.is_active == True,  # noqa: E712
            )
            .distinct()
            .all()
        )
        # Filter by tenant (global + matching tenant)
        menu_rows = [
            m
            for m in menu_rows
            if m.tenant_id is None or m.tenant_id == user.tenant_id
        ]
    else:
        menu_rows = []
    
    menu_tree = menu_service.build_menu_tree(menu_rows) if menu_rows else []

    return feature_codes, menu_tree


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


