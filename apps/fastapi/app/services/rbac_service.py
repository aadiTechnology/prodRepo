"""Service helpers for RBAC assignments and login context."""

from collections import defaultdict
from enum import Enum
from typing import List, Tuple, Dict, Any, Optional

from sqlalchemy import insert, func, Integer
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


def _as_int(value: object) -> int:
    """Coerce ORM scalar values to int for runtime and type checkers."""
    return int(value)  # type: ignore[arg-type]


def _as_bool(value: object) -> bool:
    """Coerce ORM scalar values to bool for runtime and type checkers."""
    return bool(value)  # type: ignore[arg-type]

# Menus that may lack feature_id in the catalog but still map to a feature for permission codes.
MENU_PATH_FEATURE_CODES: dict[str, str] = {
    "/communication/notices": "COMMUNICATION_MGMT",
}


def _feature_code_for_menu(menu: Menu) -> str | None:
    if menu.feature_id is not None and menu.feature is not None:
        return str(menu.feature.code)
    path = (menu.path or "").strip()
    if path:
        return MENU_PATH_FEATURE_CODES.get(path)
    return None


class RoleScope(str, Enum):
    PLATFORM = "PLATFORM"
    TENANT = "TENANT"
    BOTH = "BOTH"


def _prune_empty_module_nodes(nodes: List[MenuNode]) -> List[MenuNode]:
    """Drop module nodes that have no route and no visible child pages."""
    pruned: List[MenuNode] = []
    for node in nodes:
        children = _prune_empty_module_nodes(node.children) if node.children else []
        if children or (node.path or "").strip():
            pruned.append(
                MenuNode(
                    id=node.id,
                    name=node.name,
                    path=node.path,
                    icon=node.icon,
                    children=children,
                )
            )
    return pruned


def _level1_module_has_visible_child(
    module_id: int,
    menus_with_view: set[int],
    children_by_parent: Dict[int, List[int]],
) -> bool:
    """True when the module is a leaf or at least one child menu has can_view."""
    child_ids = children_by_parent.get(module_id, [])
    if not child_ids:
        return True
    return any(cid in menus_with_view for cid in child_ids)


def _include_menu_with_parents_from_cache(
    menu: Menu, menu_rows: List[Menu], seen_menu_ids: set[int], menu_cache: Dict[int, Menu]
) -> None:
    """
    Include a menu and all of its ancestors (level-1 parents) in menu_rows.
    Uses a pre-loaded menu_cache to avoid database queries (OPTIMIZED).
    Ancestors are included even if they have no explicit RoleMenuPermission entry,
    so the sidebar can render the full hierarchy.
    """
    current = menu
    while current:
        current_id: int = int(current.id)  # type: ignore
        if current_id in seen_menu_ids:
            return
        # Check boolean attributes - convert Column to bool if needed
        try:
            is_active = bool(current.is_active)  # type: ignore
            is_deleted = bool(current.is_deleted)  # type: ignore
        except (TypeError, ValueError):
            return
        if not is_active or is_deleted:
            return
        menu_rows.append(current)
        seen_menu_ids.add(current_id)
        parent_id: int | None = None
        if current.parent_id:  # type: ignore
            parent_id = int(current.parent_id)  # type: ignore
        if parent_id is None:
            return
        # Look up parent from cache instead of querying DB (OPTIMIZATION!)
        current = menu_cache.get(parent_id)
        if current is None:
            return


def _include_menu_with_parents(db: Session, menu: Menu, menu_rows: List[Menu], seen_menu_ids: set[int]) -> None:
    """
    Include a menu and all of its ancestors (level-1 parents) in menu_rows.
    Ancestors are included even if they have no explicit RoleMenuPermission entry,
    so the sidebar can render the full hierarchy. Soft-deleted or inactive
    ancestors are skipped (walk aborts).
    """
    current = menu
    current_id = int(current.id)  # type: ignore
    while current and current_id not in seen_menu_ids:
        try:
            is_active = bool(current.is_active)  # type: ignore
            is_deleted = bool(current.is_deleted)  # type: ignore
        except (TypeError, ValueError):
            return
        if not is_active or is_deleted:
            return
        menu_rows.append(current)
        seen_menu_ids.add(current_id)
        parent_id = current.parent_id  # type: ignore
        if parent_id is None:
            return
        current = (
            db.query(Menu)
            .filter(
                Menu.id == parent_id,
                Menu.is_active == True,  # noqa: E712
                Menu.is_deleted == False,  # noqa: E712
            )
            .first()
        )
        if current:
            current_id = int(current.id)  # type: ignore


def get_user_roles(db: Session, user_id: int) -> List[Role]:
    """Return all non-deleted roles assigned to a user."""
    return (
        db.query(Role)
        .join(user_roles, user_roles.c.role_id == Role.id)
        .filter(user_roles.c.user_id == user_id, Role.is_deleted == False)  # noqa: E712
        .all()
    )


def _resolve_effective_role_ids(
    db: Session,
    user: User,
    roles: List[Role],
) -> list[int]:
    """
    Return effective role IDs used for menu/permission resolution.

    Now decoupled so that tenant roles (like teachers and students) do not
    automatically inherit all tenant admin role grants, allowing custom permissions
    assigned to their roles to take effect.
    """
    return [int(r.id) for r in roles]  # type: ignore


def _validate_role_scope(role: Role, user: User, action: str) -> None:
    """Validate that a role can be assigned to a user based on scope."""
    role_scope = (role.scope_type or RoleScope.TENANT).upper()
    
    if role_scope == RoleScope.PLATFORM.value and user.tenant_id is not None:
        raise ForbiddenException(
            f"Cannot {action} platform-level role '{role.code}' to a tenant user."
        )
    
    if role_scope == RoleScope.TENANT.value and user.tenant_id is None:
        raise ForbiddenException(
            f"Cannot {action} tenant-level role '{role.code}' to a platform user."
        )
    
    if role_scope == RoleScope.TENANT.value and role.tenant_id is not None and role.tenant_id != user.tenant_id:  # type: ignore
        raise ForbiddenException(
            f"Cannot {action} role '{role.code}' - role belongs to a different tenant."
        )


def set_user_roles(
    db: Session,
    user: User,
    role_ids: List[int],
    acting_user_id: int | None = None,
    acting_user: User | Any | None = None,
) -> None:
    """Replace user roles with the given set."""
    if acting_user is not None:
        acting_user_tenant_id = acting_user.tenant_id  # type: ignore
        user_tenant_id = user.tenant_id  # type: ignore
        if (acting_user_tenant_id is not None) is True and (user_tenant_id == acting_user_tenant_id) is False:
            raise ForbiddenException("Cannot update roles for a user from a different tenant.")

    for role_id in role_ids:
        role = db.query(Role).filter(Role.id == role_id, Role.is_deleted == False).first()
        if not role:
            raise ValidationException(f"Role with id {role_id} not found.")
        _validate_role_scope(role, user, "assign")
        if acting_user is not None:
            acting_user_tenant_id = acting_user.tenant_id  # type: ignore
            if acting_user_tenant_id is not None:
                role_tenant_id = role.tenant_id  # type: ignore
                if (role_tenant_id == acting_user_tenant_id) is False:
                    raise ForbiddenException(f"Cannot assign role '{role.code}' from a different tenant.")
    
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
    menu_tenant_id = menu.tenant_id  # type: ignore
    role_tenant_id = role.tenant_id  # type: ignore
    
    if menu_tenant_id is None:
        return
    
    if (role_tenant_id is not None) is True:
        if (menu_tenant_id == role_tenant_id) is False:
            raise ForbiddenException(
                f"Cannot assign menu '{menu.name}' to role '{role.code}' - menu belongs to a different tenant."
            )
    else:
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
        if menu is None:
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
    
    OPTIMIZED: Uses eager loading and batch queries to reduce DB calls from 50-100 to ~5-8
    """
    from sqlalchemy.orm import joinedload
    from app.models.user import UserRole
    from app.core.dependencies import SYSTEM_ADMIN_ROLE_CODE
    
    logger.info(f"[RBAC] Resolving permissions for user: {user.email} (role={user.role})")
    
    # Query 1: Get user roles
    roles = get_user_roles(db, int(user.id))  # type: ignore
    role_ids = _resolve_effective_role_ids(db, user, roles)
    role_codes = [r.code.lower() for r in roles]
    
    # Check if user is SUPER_ADMIN
    is_super_admin = (
        user.role == UserRole.SUPER_ADMIN or 
        (user.role == UserRole.ADMIN and user.tenant_id is None) or
        SYSTEM_ADMIN_ROLE_CODE.lower() in role_codes
    )
    
    permission_codes = set()
    menu_rows = []

    if is_super_admin:  # type: ignore
        # SUPER_ADMIN gets everything
        logger.info("[RBAC] User is SUPER_ADMIN. Granting full access.")
        
        # Query 2: Get all active features
        features = db.query(Feature).filter(
            Feature.is_active == True,  # noqa: E712
            Feature.is_deleted == False  # noqa: E712
        ).all()
        for f in features:
            for action in ["view", "create", "edit", "delete"]:
                permission_codes.add(f"{f.code}:{action}")
        
        # Query 3: Get all menus (single query instead of multiple parent lookups)
        menu_rows = db.query(Menu).filter(
            Menu.is_active == True,  # noqa: E712
            Menu.is_deleted == False,  # noqa: E712
        ).all()
        # Filter by tenant
        menu_rows = [m for m in menu_rows if m.tenant_id is None or m.tenant_id == user.tenant_id]  # type: ignore
        
    elif role_ids:
        # Determine if it's a tenant non-admin user
        tenant_admin_role_id = None
        is_tenant_non_admin = False
        if user.tenant_id is not None:
            tenant_admin_role = (
                db.query(Role)
                .filter(
                    Role.tenant_id == user.tenant_id,
                    Role.code == "ADMIN",
                    Role.is_deleted == False,
                    Role.is_active == True,
                )
                .first()
            )
            if tenant_admin_role:
                tenant_admin_role_id = _as_int(tenant_admin_role.id)
                assigned_codes_upper = {c.upper() for c in role_codes}
                if "ADMIN" not in assigned_codes_upper and "TENANT_ADMIN" not in assigned_codes_upper:
                    is_tenant_non_admin = True

        query_role_ids = role_ids
        if is_tenant_non_admin and tenant_admin_role_id is not None:
            query_role_ids = list(set(role_ids + [tenant_admin_role_id]))

        # Single query: JOIN RoleMenuPermission → Menu → Feature + LEFT JOIN all menus for
        # parent resolution.  contains_eager() tells SQLAlchemy to populate the ORM
        # relationships from the rows already fetched by our explicit JOINs, so we
        # avoid the extra SELECT that joinedload() would issue.
        from sqlalchemy.orm import contains_eager

        perms = (
            db.query(RoleMenuPermission)
            .join(RoleMenuPermission.menu)
            .outerjoin(Menu.feature)
            .options(
                contains_eager(RoleMenuPermission.menu).contains_eager(Menu.feature)
            )
            .filter(
                RoleMenuPermission.role_id.in_(query_role_ids),
                Menu.is_active == True,  # noqa: E712
                Menu.is_deleted == False,  # noqa: E712
            )
            .all()
        )

        # Aggregate permissions for user roles (union)
        user_menu_perms = {}
        for p in perms:
            if _as_int(p.role_id) in role_ids:
                menu_id = _as_int(p.menu_id)
                if menu_id not in user_menu_perms:
                    user_menu_perms[menu_id] = {
                        "can_view": False,
                        "can_create": False,
                        "can_edit": False,
                        "can_delete": False,
                        "menu": p.menu
                    }
                user_menu_perms[menu_id]["can_view"] |= bool(p.can_view)
                user_menu_perms[menu_id]["can_create"] |= bool(p.can_create)
                user_menu_perms[menu_id]["can_edit"] |= bool(p.can_edit)
                user_menu_perms[menu_id]["can_delete"] |= bool(p.can_delete)

        # Aggregate permissions for tenant admin (union/value)
        admin_menu_perms = {}
        if is_tenant_non_admin and tenant_admin_role_id is not None:
            for p in perms:
                if _as_int(p.role_id) == tenant_admin_role_id:
                    menu_id = _as_int(p.menu_id)
                    if menu_id not in admin_menu_perms:
                        admin_menu_perms[menu_id] = {
                            "can_view": False,
                            "can_create": False,
                            "can_edit": False,
                            "can_delete": False
                        }
                    admin_menu_perms[menu_id]["can_view"] |= bool(p.can_view)
                    admin_menu_perms[menu_id]["can_create"] |= bool(p.can_create)
                    admin_menu_perms[menu_id]["can_edit"] |= bool(p.can_edit)
                    admin_menu_perms[menu_id]["can_delete"] |= bool(p.can_delete)

        # Compute effective intersected permissions
        effective_menu_perms = {}
        for menu_id, u_perm in user_menu_perms.items():
            if is_tenant_non_admin:
                a_perm = admin_menu_perms.get(menu_id)
                if not a_perm or not a_perm["can_view"]:
                    continue  # Admin doesn't have view access, so user doesn't either
                
                # View requires tenant admin view (module enabled). Create/edit/delete follow
                # the user's role grant once the module is visible to the tenant.
                tenant_module_enabled = bool(a_perm["can_view"])
                effective_menu_perms[menu_id] = {
                    "can_view": u_perm["can_view"] and tenant_module_enabled,
                    "can_create": u_perm["can_create"] and tenant_module_enabled,
                    "can_edit": u_perm["can_edit"] and tenant_module_enabled,
                    "can_delete": u_perm["can_delete"] and tenant_module_enabled,
                    "menu": u_perm["menu"],
                }
            else:
                effective_menu_perms[menu_id] = u_perm

        # Build permission codes and menu list (all related data in memory — no lazy loads)
        seen_menu_ids: set[int] = set()
        menus_to_include: List[Menu] = []

        all_menus_query = db.query(Menu).filter(
            Menu.is_active == True,  # noqa: E712
            Menu.is_deleted == False,  # noqa: E712
        ).all()
        menu_cache = {int(m.id): m for m in all_menus_query}  # type: ignore
        children_by_parent: Dict[int, List[int]] = defaultdict(list)
        for m in all_menus_query:
            if m.parent_id is not None:
                children_by_parent[int(m.parent_id)].append(int(m.id))  # type: ignore

        menus_with_view = {mid for mid, ep in effective_menu_perms.items() if ep["can_view"]}

        for menu_id, ep in effective_menu_perms.items():
            m = ep["menu"]
            if not ep["can_view"]:
                continue
            if m.tenant_id is not None and m.tenant_id != user.tenant_id:
                continue

            menu_id_int = int(m.id)
            if m.level == 1 and not _level1_module_has_visible_child(
                menu_id_int, menus_with_view, children_by_parent
            ):
                continue

            f_code = _feature_code_for_menu(m)
            if f_code:
                if ep["can_view"]:
                    permission_codes.add(f"{f_code}:view")
                if ep["can_create"]:
                    permission_codes.add(f"{f_code}:create")
                if ep["can_edit"]:
                    permission_codes.add(f"{f_code}:edit")
                if ep["can_delete"]:
                    permission_codes.add(f"{f_code}:delete")

            menus_to_include.append(m)

        for m in menus_to_include:
            _include_menu_with_parents_from_cache(m, menu_rows, seen_menu_ids, menu_cache)

    logger.info(f"[RBAC] Resolved {len(permission_codes)} permission codes and {len(menu_rows)} menu rows (optimized)")

    menu_tree = menu_service.build_menu_tree(menu_rows) if menu_rows else []
    menu_tree = _prune_empty_module_nodes(menu_tree)
    return list(permission_codes), menu_tree


def compute_rbac_version(db: Session, user: User) -> str:
    """
    Return an opaque version string that changes whenever this user's effective
    RBAC could change: role assignments, role-menu permissions, or menu catalog.

    Used by clients to poll /auth/rbac/context cheaply and decide if they should
    replace local state (driving "live" sidebar updates).
    """
    user_id = int(user.id)  # type: ignore
    roles = get_user_roles(db, user_id)
    role_ids = _resolve_effective_role_ids(db, user, roles)
    role_codes = [r.code.lower() for r in roles]

    # For version computing, we want to watch any changes in user's own roles OR the tenant admin role
    # if the user is a tenant non-admin user (due to permission intersection).
    tenant_admin_id = None
    if user.tenant_id is not None:
        assigned_codes_upper = {c.upper() for c in role_codes}
        if "ADMIN" not in assigned_codes_upper and "TENANT_ADMIN" not in assigned_codes_upper:
            tenant_admin_role = (
                db.query(Role)
                .filter(
                    Role.tenant_id == user.tenant_id,
                    Role.code == "ADMIN",
                    Role.is_deleted == False,
                    Role.is_active == True,
                )
                .first()
            )
            if tenant_admin_role:
                tenant_admin_id = _as_int(tenant_admin_role.id)

    version_role_ids = list(set(role_ids + ([tenant_admin_id] if tenant_admin_id is not None else [])))

    # Latest change across this user's RoleMenuPermission rows.
    perms_ts = None
    perms_count = 0
    perms_signature = 0
    if version_role_ids:
        perms_ts = (
            db.query(
                func.max(
                    func.coalesce(RoleMenuPermission.updated_at, RoleMenuPermission.created_at)
                )
            )
            .filter(RoleMenuPermission.role_id.in_(version_role_ids))
            .scalar()
        )
        perms_count = (
            db.query(RoleMenuPermission.id)
            .filter(RoleMenuPermission.role_id.in_(version_role_ids))
            .count()
        )
        perms_signature = (
            db.query(
                func.coalesce(
                    func.sum(
                        (RoleMenuPermission.can_view.cast(Integer) * 1)
                        + (RoleMenuPermission.can_create.cast(Integer) * 2)
                        + (RoleMenuPermission.can_edit.cast(Integer) * 4)
                        + (RoleMenuPermission.can_delete.cast(Integer) * 8)
                    ),
                    0,
                )
            )
            .filter(RoleMenuPermission.role_id.in_(version_role_ids))
            .scalar()
            or 0
        )

    # Also include the user's role-assignment changes and menu catalog changes,
    # so revoking a role or toggling a menu active flag also bumps the version.
    # Association column name differs by environment (`assigned_at` vs `granted_at`),
    # so resolve defensively to avoid hard crashes on login/context.
    user_roles_ts_col = None
    if hasattr(user_roles.c, "assigned_at"):
        user_roles_ts_col = user_roles.c.assigned_at
    elif hasattr(user_roles.c, "granted_at"):
        user_roles_ts_col = user_roles.c.granted_at

    user_roles_ts = None
    if user_roles_ts_col is not None:
        user_roles_ts = (
            db.query(func.max(user_roles_ts_col))
            .filter(user_roles.c.user_id == user.id)
            .scalar()
        )

    menus_filter = Menu.tenant_id.is_(None)
    if user.tenant_id is not None:
        menus_filter = (Menu.tenant_id.is_(None)) | (Menu.tenant_id == user.tenant_id)
    menus_ts = (
        db.query(func.max(func.coalesce(Menu.updated_at, Menu.created_at)))
        .filter(menus_filter)
        .scalar()
    )

    # Keep sub-second precision to avoid missing rapid consecutive edits.
    def _ts_to_str(ts):
        if not ts:
            return "0"
        return ts.isoformat()

    parts = [
        _ts_to_str(perms_ts),
        _ts_to_str(user_roles_ts),
        _ts_to_str(menus_ts),
        str(len(version_role_ids)),
        str(perms_count),
        str(perms_signature),
    ]
    return ".".join(parts)


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
            if menu.tenant_id != role.tenant_id:  # type: ignore
                raise ForbiddenException(
                    f"Cannot assign permissions for menu '{menu.name}' from different tenant."
                )
        elif menu.tenant_id is not None and role.tenant_id is None:
            raise ForbiddenException(
                f"Cannot assign tenant-specific menu '{menu.name}' to a platform role."
            )
    
    # Snapshot existing role permissions before replacement so delegation checks can
    # distinguish "newly granted now" vs "already existed on the role".
    existing_perms_map: dict[int, RoleMenuPermission] = {
        _as_int(row.menu_id): row
        for row in db.query(RoleMenuPermission).filter(RoleMenuPermission.role_id == role.id).all()
    }

    # Delegation Validation: Ensure acting user has permissions for NEW grants only.
    if acting_user_id:
        acting_user = db.query(User).get(acting_user_id)
        if acting_user:
            # Check if acting user is SUPER_ADMIN
            user_role = acting_user.role  # type: ignore
            user_tenant_id = acting_user.tenant_id  # type: ignore
            is_super_admin = (
                user_role == "SUPER_ADMIN" or 
                (user_role == "ADMIN" and user_tenant_id is None)
            )
            
            if not is_super_admin:  # type: ignore[misc]  # noqa: E712
                # Get acting user's effective permissions
                user_perms_codes, _ = resolve_user_permissions_and_menus(db, acting_user)
                user_perms = set(user_perms_codes)
                
                for p in data.permissions:
                    menu = db.query(Menu).get(p.menu_id) # Already checked above
                    if not menu or not menu.feature:
                        continue
                        
                    f_code = menu.feature.code
                    existing = existing_perms_map.get(_as_int(p.menu_id))
                    
                    # Only validate when permission is newly enabled in this request.
                    if (
                        p.can_view
                        and not (_as_bool(existing.can_view) if existing else False)
                        and f"{f_code}:view" not in user_perms
                    ):
                        raise ForbiddenException(f"You cannot grant 'view' access to '{menu.name}' because you don't have it.")
                    if (
                        p.can_create
                        and not (_as_bool(existing.can_create) if existing else False)
                        and f"{f_code}:create" not in user_perms
                    ):
                        raise ForbiddenException(f"You cannot grant 'create' access to '{menu.name}' because you don't have it.")
                    if (
                        p.can_edit
                        and not (_as_bool(existing.can_edit) if existing else False)
                        and f"{f_code}:edit" not in user_perms
                    ):
                        raise ForbiddenException(f"You cannot grant 'edit' access to '{menu.name}' because you don't have it.")
                    if (
                        p.can_delete
                        and not (_as_bool(existing.can_delete) if existing else False)
                        and f"{f_code}:delete" not in user_perms
                    ):
                        raise ForbiddenException(f"You cannot grant 'delete' access to '{menu.name}' because you don't have it.")

    try:
        db.query(RoleMenuPermission).filter(
            RoleMenuPermission.role_id == role.id
        ).delete()

        new_perms = []
        granted_menu_ids: list[int] = []
        for p in data.permissions:
            has_any_access = p.can_view or p.can_create or p.can_edit or p.can_delete
            if has_any_access:
                granted_menu_ids.append(p.menu_id)
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
        
        # Keep legacy role_menus association in sync with matrix grants.
        db.execute(role_menus.delete().where(role_menus.c.role_id == role.id))
        if granted_menu_ids:
            db.execute(
                role_menus.insert(),
                [{"role_id": role.id, "menu_id": menu_id} for menu_id in granted_menu_ids],
            )

        db.commit()
        logger.info(
            f"[RBAC] Updated {len(new_perms)} granular permissions and "
            f"{len(granted_menu_ids)} role_menus rows for role {role.code} (id={role.id})"
        )
        if role.tenant_id is not None:
            from app.services.ai_permission_sync_service import sync_ai_tenant_plan_from_permissions

            try:
                sync_ai_tenant_plan_from_permissions(db, int(role.tenant_id))
            except Exception as sync_err:
                logger.warning(
                    "[RBAC] AI plan sync failed for tenant_id=%s: %s",
                    role.tenant_id,
                    sync_err,
                )
    except (IntegrityError, DataError) as e:
        db.rollback()
        logger.error(f"[RBAC] Failed to update permissions for role {role.code} (id={role.id}): {str(e)}")
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[RBAC] Failed to update permissions for role {role.code} (id={role.id}): {str(e)}")
        raise


def backfill_role_menu_permissions_from_role_menus(
    db: Session, *, created_by: int | None = None
) -> int:
    """
    Insert RoleMenuPermission for each role_menus pair that has no matching row.
    Grants full menu CRUD (same default as tenant provisioning). Safe to re-run; skips existing pairs.
    """
    pairs = (
        db.query(role_menus.c.role_id, role_menus.c.menu_id, Role.tenant_id)
        .join(Role, Role.id == role_menus.c.role_id)
        .outerjoin(
            RoleMenuPermission,
            (RoleMenuPermission.role_id == role_menus.c.role_id)
            & (RoleMenuPermission.menu_id == role_menus.c.menu_id),
        )
        .filter(
            RoleMenuPermission.id.is_(None),
            Role.is_deleted == False,  # noqa: E712
        )
        .all()
    )
    if not pairs:
        return 0
    for role_id, menu_id, tenant_id in pairs:
        db.add(
            RoleMenuPermission(
                role_id=role_id,
                tenant_id=tenant_id,
                menu_id=menu_id,
                can_view=True,
                can_create=True,
                can_edit=True,
                can_delete=True,
                created_by=created_by,
            )
        )
    db.commit()
    logger.info("[RBAC] Backfilled %s role_menu_permissions from role_menus", len(pairs))
    return len(pairs)


def sync_global_menus_to_tenant_admin_roles(db: Session, *, created_by: int | None = None) -> tuple[int, int]:
    """
    DEPRECATED — do not use under strict permission assignment.

    Previously auto-granted all new global catalog menus with full CRUD to every
    tenant-scoped ADMIN role. System admin must assign permissions manually via
    Permission Management instead.

    Kept for backward compatibility with one-off repair scripts only.
    Returns (role_menus_rows_inserted, role_menu_permissions_rows_inserted).
    """
    global_menu_ids = [
        row[0]
        for row in db.query(Menu.id).filter(
            Menu.tenant_id.is_(None),
            Menu.is_active == True,  # noqa: E712
            Menu.is_deleted == False,  # noqa: E712
        ).all()
    ]
    if not global_menu_ids:
        return (0, 0)

    admin_roles = (
        db.query(Role)
        .filter(
            Role.code == "ADMIN",
            Role.tenant_id.isnot(None),
            Role.is_deleted == False,  # noqa: E712
        )
        .all()
    )
    rm_inserts = 0
    rmp_inserts = 0
    for role in admin_roles:
        existing_rm = {
            r[0]
            for r in db.query(role_menus.c.menu_id).filter(role_menus.c.role_id == role.id).all()
        }
        existing_rmp = {
            r[0]
            for r in db.query(RoleMenuPermission.menu_id).filter(RoleMenuPermission.role_id == role.id).all()
        }
        for mid in global_menu_ids:
            # Only add to role_menus if NOT already linked
            if mid not in existing_rm:
                db.execute(
                    insert(role_menus),
                    [{"role_id": role.id, "menu_id": mid}],
                )
                rm_inserts += 1
            
            # Only add to RoleMenuPermission if NOT already linked
            # This preserves any existing custom permission settings
            if mid not in existing_rmp:
                db.add(
                    RoleMenuPermission(
                        role_id=role.id,
                        tenant_id=role.tenant_id,
                        menu_id=mid,
                        can_view=True,
                        can_create=True,
                        can_edit=True,
                        can_delete=True,
                        created_by=created_by,
                    )
                )
                rmp_inserts += 1
                existing_rmp.add(mid)
    
    if rm_inserts or rmp_inserts:
        db.commit()
    
    logger.info(
        "[RBAC] sync_global_menus_to_tenant_admin_roles: Added NEW menus - role_menus +%s, role_menu_permissions +%s. "
        "Existing permissions NOT modified.",
        rm_inserts,
        rmp_inserts,
    )
    return (rm_inserts, rmp_inserts)