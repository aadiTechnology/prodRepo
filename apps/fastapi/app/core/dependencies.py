"""FastAPI dependencies for authentication and authorization."""
from enum import Enum
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional, cast
from app.core.database import get_db, SessionLocal
from app.models.user import User, UserRole
from app.schemas.auth import CurrentUser
from app.utils.security import decode_access_token
from app.core.exceptions import UnauthorizedException, ForbiddenException
from app.core.logging_config import get_logger
from app.models.revoked_token import RevokedToken
from app.core.config import settings

logger = get_logger(__name__)

# HTTP Bearer token scheme - set auto_error=False to handle errors ourselves
security = HTTPBearer(auto_error=False)


class PermissionAction(str, Enum):
    VIEW = "view"
    CREATE = "create"
    EDIT = "edit"
    DELETE = "delete"


def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> CurrentUser:
    """
    Dependency to get the current authenticated user from JWT token.
    
    Args:
        request: FastAPI request object
        credentials: HTTP Bearer token credentials
        db: Database session
    
    Returns:
        CurrentUser: Current authenticated user
    
    Raises:
        UnauthorizedException: If token is invalid or user not found
    """
    # Check if credentials were provided
    if not credentials:
        # Try to get token from Authorization header manually
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            logger.warning("No authorization header provided")
            raise UnauthorizedException("Missing authorization header")
        
        # Extract token from "Bearer <token>" format
        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            logger.warning(f"Invalid authorization header format: {auth_header[:20]}...")
            raise UnauthorizedException("Invalid authorization header format. Expected 'Bearer <token>'")
        
        token = parts[1]
    else:
        token = credentials.credentials
    
    if not token:
        logger.warning("Empty token provided")
        raise UnauthorizedException("Missing authentication token")
    
    logger.debug(f"Attempting to decode token (length: {len(token)})")
    
    # Decode token
    payload = decode_access_token(token)
    if not payload:
        logger.error("Failed to decode token - invalid signature, expired, or SECRET_KEY mismatch")
        raise UnauthorizedException("Invalid authentication token")
    
    logger.debug(f"Token decoded successfully. Payload keys: {list(payload.keys())}")
    
    # Extract user ID from token (sub claim)
    # Note: JWT 'sub' claim is stored as string, so convert to int
    sub_claim = payload.get("sub")
    if sub_claim is None:
        logger.warning(f"Token missing user ID. Payload: {payload}")
        raise UnauthorizedException("Invalid token payload - missing user ID")
    
    try:
        user_id = int(sub_claim)
    except (ValueError, TypeError):
        logger.warning(f"Token 'sub' claim is not a valid integer: {sub_claim}")
        raise UnauthorizedException("Invalid token payload - user ID must be an integer")
    
    logger.debug(f"Extracted user ID from token: {user_id}")
        
    # Check if token is revoked
    if db.query(RevokedToken).filter(RevokedToken.token == token).first():
        logger.warning("Token is revoked/blacklisted")
        raise UnauthorizedException("Token has been revoked. Please login again.")

    # Get user from database
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        logger.warning(f"User not found for token user_id: {user_id}")
        raise UnauthorizedException("User not found")
    
    logger.debug(f"User authenticated: {user.email} (role: {user.role.value}, tenant_id: {user.tenant_id})")

    return CurrentUser(
        id=cast(int, user.id),
        email=cast(str, user.email),
        full_name=cast(str, user.full_name),
        role=cast(UserRole, user.role),
        tenant_id=cast(Optional[int], user.tenant_id),
        is_impersonation=payload.get("is_impersonation"),
        original_user_id=payload.get("original_user_id"),
    )


# RBAC role codes from DB that are treated as admin / system admin (see roles table in SSMS)

SYSTEM_ADMIN_ROLE_CODE = "SYSTEM_ADMIN"  # Changed from SUPER_ADMIN to match database



def get_rbac_role_codes(db: Session, user_id: int) -> list[str]:
    """Load role codes from DB (user_roles + roles) for the user. Used for permission checks."""
    from app.models.role import user_roles, Role

    rbac_roles = (
        db.query(Role)
        .join(user_roles, user_roles.c.role_id == Role.id)
        .filter(
            user_roles.c.user_id == user_id,
            Role.is_deleted == False,  # noqa: E712
        )
        .all()
    )
    return [r.code.lower() for r in rbac_roles]


def is_platform_system_admin(db: Session, current_user: CurrentUser) -> bool:
    """True if the user is an org-level system admin (no tenant) with admin privileges."""
    if current_user.tenant_id is not None:
        return False

    if current_user.role in (UserRole.SUPER_ADMIN, UserRole.ADMIN):
        return True

    role_str = (
        current_user.role.value
        if isinstance(current_user.role, UserRole)
        else str(current_user.role or "")
    ).upper()
    if role_str in ("SUPER_ADMIN", "ADMIN", "SYSTEM_ADMIN"):
        return True

    rbac_role_codes = get_rbac_role_codes(db, current_user.id)
    return any(
        code in rbac_role_codes
        for code in (SYSTEM_ADMIN_ROLE_CODE.lower(), "super_admin", "system_admin")
    )


def resolve_tenant_id_for_academic_year_list(
    db: Session,
    current_user: CurrentUser,
    tenant_id_query: Optional[int],
) -> int:
    """
    Resolve which tenant's academic years to list.

    School users always use their own tenant_id. Optional query tenant_id must match.
    Platform system admins must pass tenant_id (e.g. ?tenant_id=1) or use impersonation.
    """
    if current_user.tenant_id is not None:
        if tenant_id_query is not None and tenant_id_query != current_user.tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot load another tenant's academic years.",
            )
        return current_user.tenant_id
    if not is_platform_system_admin(db, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to list academic years.",
        )
    if tenant_id_query is None or tenant_id_query < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Query parameter tenant_id is required for system administrator accounts "
                "(e.g. ?tenant_id=1), or sign in as a school user or use impersonation."
            ),
        )
    return tenant_id_query


def require_role(allowed_roles: list[UserRole]):
    """
    Dependency factory to require specific roles.
    Checks legacy User.role and RBAC user_roles table (database is source of truth).
    For admin access, allows both 'admin' and 'system_admin' role codes from DB.
    """
    def role_checker(
        current_user: CurrentUser = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> CurrentUser:
        # SUPER_ADMIN users get full access to everything
        if current_user.role == UserRole.SUPER_ADMIN:
            return current_user
        
        # Legacy: users.role column
        if current_user.role in allowed_roles:
            return current_user

        rbac_role_codes = get_rbac_role_codes(db, current_user.id)
        
        # Check if user has SYSTEM_ADMIN role code from database
        if SYSTEM_ADMIN_ROLE_CODE.lower() in rbac_role_codes:
            return current_user
        
        # Allow role codes from DB: enum values + SYSTEM_ADMIN (so sysadmin@server.com passes)
        allowed_role_codes = [ur.value.lower() for ur in allowed_roles]
        if UserRole.ADMIN in allowed_roles:
            allowed_role_codes.append(SYSTEM_ADMIN_ROLE_CODE.lower())

        if not any(code in allowed_role_codes for code in rbac_role_codes):
            logger.warning(
                f"User {current_user.email} attempted to access resource requiring roles: {allowed_roles} "
                f"(legacy: {current_user.role}, rbac: {rbac_role_codes})"
            )
            raise ForbiddenException("Insufficient permissions")
        return current_user

    return role_checker


def require_system_admin(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CurrentUser:
    """
    Only System Admin (org-level) can pass. Used for tenant CRUD and assigning
    roles/features/menus to users. Tenant admins must not pass.
    """
    if current_user.tenant_id is not None:
        logger.warning(
            f"User {current_user.email} (tenant_id={current_user.tenant_id}) attempted system-admin-only resource"
        )
        raise ForbiddenException("Insufficient permissions")

    # Check legacy role column for ADMIN or SUPER_ADMIN
    if current_user.role in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        return current_user

    rbac_role_codes = get_rbac_role_codes(db, current_user.id)
    if SYSTEM_ADMIN_ROLE_CODE.lower() in rbac_role_codes:
        return current_user

    logger.warning(
        f"User {current_user.email} attempted system-admin-only resource "
        f"(legacy: {current_user.role}, rbac: {rbac_role_codes})"
    )
    raise ForbiddenException("Insufficient permissions")


# Convenience dependencies
require_admin = require_role([UserRole.ADMIN, UserRole.TENANT_ADMIN])
require_user = require_role([UserRole.USER, UserRole.ADMIN])


def _menu_permission_label(*, menu_name: str | None, menu_path: str | None) -> str:
    if menu_name:
        return menu_name
    return f"route {menu_path}"


def _enforce_menu_permission(
    db: Session,
    current_user: CurrentUser,
    action: str,
    *,
    menu_name: str | None = None,
    menu_path: str | None = None,
) -> CurrentUser:
    """
    Enforce role_menu_permissions by menu name or route path.

    Path-based checks match any active menu row with that path (handles renamed
  catalog entries such as School Notices vs Create Notices).
    """
    if not menu_name and not menu_path:
        raise ValueError("menu_name or menu_path is required")

    from app.models.role import Role, user_roles as user_roles_table
    from app.models.role_menu_permission import RoleMenuPermission
    from app.models.menu import Menu

    label = _menu_permission_label(menu_name=menu_name, menu_path=menu_path)

    action_col_map = {
        PermissionAction.VIEW.value: "can_view",
        PermissionAction.CREATE.value: "can_create",
        PermissionAction.EDIT.value: "can_edit",
        PermissionAction.DELETE.value: "can_delete",
    }
    action_col_name = action_col_map.get(action)

    if not action_col_name:
        raise ForbiddenException(
            f"Invalid action '{action}'. Must be one of: {[a.value for a in PermissionAction]}"
        )

    if is_platform_system_admin(db, current_user):
        return current_user

    if current_user.role == UserRole.SUPER_ADMIN:
        return current_user

    if current_user.role == UserRole.ADMIN and current_user.tenant_id is None:
        return current_user

    rbac_roles = get_rbac_role_codes(db, current_user.id)
    if SYSTEM_ADMIN_ROLE_CODE.lower() in rbac_roles:
        return current_user

    role_id_rows = (
        db.query(user_roles_table.c.role_id)
        .filter(user_roles_table.c.user_id == current_user.id)
        .all()
    )
    role_id_list = [r[0] for r in role_id_rows]

    if not role_id_list:
        logger.warning(
            f"User {current_user.email} has no roles assigned — denied '{action}' on '{label}'"
        )
        raise ForbiddenException(
            f"Access denied: No roles assigned. Required: '{action}' permission on '{label}'."
        )

    menu_filters = [
        Menu.is_active == True,  # noqa: E712
        Menu.is_deleted == False,  # noqa: E712
    ]
    if menu_name:
        menu_filters.append(Menu.name == menu_name)
    else:
        menu_filters.append(Menu.path == menu_path)

    perm = (
        db.query(RoleMenuPermission)
        .join(Menu, RoleMenuPermission.menu_id == Menu.id)
        .filter(
            RoleMenuPermission.role_id.in_(role_id_list),
            *menu_filters,
            getattr(RoleMenuPermission, action_col_name) == True,
        )
        .first()
    )

    # Parent module VIEW grants read access to child pages (module row without route).
    if not perm and menu_path and action == PermissionAction.VIEW.value:
        target_menu = (
            db.query(Menu)
            .filter(
                Menu.is_active == True,  # noqa: E712
                Menu.is_deleted == False,  # noqa: E712
                Menu.path == menu_path,
            )
            .first()
        )
        if target_menu and target_menu.parent_id is not None:
            perm = (
                db.query(RoleMenuPermission)
                .filter(
                    RoleMenuPermission.role_id.in_(role_id_list),
                    RoleMenuPermission.menu_id == target_menu.parent_id,
                    RoleMenuPermission.can_view == True,  # noqa: E712
                )
                .first()
            )

    if not perm:
        logger.warning(
            f"User {current_user.email} (roles={role_id_list}) denied: "
            f"no '{action}' permission on '{label}'"
        )
        raise ForbiddenException(f"Access denied: Missing '{action}' permission on '{label}'.")

    if current_user.tenant_id is not None:
        is_tenant_admin = any(code in ["admin", "tenant_admin"] for code in rbac_roles)
        if not is_tenant_admin:
            tenant_admin_role = (
                db.query(Role)
                .filter(
                    Role.tenant_id == current_user.tenant_id,
                    Role.code == "ADMIN",
                    Role.is_deleted == False,
                    Role.is_active == True,
                )
                .first()
            )
            if not tenant_admin_role:
                logger.warning(
                    f"User {current_user.email} denied: Tenant {current_user.tenant_id} has no active ADMIN role."
                )
                raise ForbiddenException("Access denied: Tenant has no active administrator role.")

            tenant_admin_perm = (
                db.query(RoleMenuPermission)
                .join(Menu, RoleMenuPermission.menu_id == Menu.id)
                .filter(
                    RoleMenuPermission.role_id == tenant_admin_role.id,
                    *menu_filters,
                    getattr(RoleMenuPermission, action_col_name) == True,
                )
                .first()
            )
            if not tenant_admin_perm:
                logger.warning(
                    f"User {current_user.email} denied: Tenant ADMIN role (id={tenant_admin_role.id}) "
                    f"does not have '{action}' permission on '{label}'"
                )
                raise ForbiddenException(
                    f"Access denied: Tenant administrator does not have '{action}' permission on '{label}'."
                )

    return current_user


def require_permission(menu_name: str, action: str):
    """
    Dependency factory that enforces role_menu_permissions by menu name.

    Args:
        menu_name:  The `menus.name` value (e.g. "Fee Category", "Fee Structure")
        action:     One of: view, create, edit, delete
    """
    if action not in [a.value for a in PermissionAction]:
        raise ValueError(f"Invalid action '{action}'. Must be one of: {[a.value for a in PermissionAction]}")

    def checker(
        current_user: CurrentUser = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> CurrentUser:
        return _enforce_menu_permission(
            db, current_user, action, menu_name=menu_name
        )

    return checker


def require_menu_path_permission(menu_path: str, action: str):
    """
    Dependency factory that enforces role_menu_permissions by menu route path.

    Use when catalog menu names differ across environments but the frontend
    route path is stable (e.g. /communication/notices).
    """
    if action not in [a.value for a in PermissionAction]:
        raise ValueError(f"Invalid action '{action}'. Must be one of: {[a.value for a in PermissionAction]}")

    def checker(
        current_user: CurrentUser = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> CurrentUser:
        return _enforce_menu_permission(
            db, current_user, action, menu_path=menu_path
        )

    return checker
