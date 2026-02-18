"""FastAPI dependencies for authentication and authorization."""
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.models.user import User, UserRole
from app.schemas.auth import CurrentUser
from app.utils.security import decode_access_token
from app.core.exceptions import UnauthorizedException, ForbiddenException
from app.core.logging_config import get_logger

logger = get_logger(__name__)

# HTTP Bearer token scheme - set auto_error=False to handle errors ourselves
security = HTTPBearer(auto_error=False)

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
    
    logger.info(f"Attempting to decode token (length: {len(token)}, first 20 chars: {token[:20]}...)")
    
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
    
    # Get user from database
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        logger.warning(f"User not found for token user_id: {user_id}")
        raise UnauthorizedException("User not found")
    
    logger.debug(f"User authenticated: {user.email} (role: {user.role.value}, tenant_id: {user.tenant_id})")

    return CurrentUser(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        tenant_id=user.tenant_id,
    )


# RBAC role codes from DB that are treated as admin / system admin (see roles table in SSMS)

SYSTEM_ADMIN_ROLE_CODE = "SYSTEM_ADMIN"  # Changed from SUPER_ADMIN to match database


def _get_rbac_role_codes(db: Session, user_id: int) -> list[str]:
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

        rbac_role_codes = _get_rbac_role_codes(db, current_user.id)
        
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

    rbac_role_codes = _get_rbac_role_codes(db, current_user.id)
    if SYSTEM_ADMIN_ROLE_CODE.lower() in rbac_role_codes:
        return current_user

    logger.warning(
        f"User {current_user.email} attempted system-admin-only resource "
        f"(legacy: {current_user.role}, rbac: {rbac_role_codes})"
    )
    raise ForbiddenException("Insufficient permissions")


# Convenience dependencies////
#---
require_admin = require_role([UserRole.ADMIN])
require_user = require_role([UserRole.USER, UserRole.ADMIN])
