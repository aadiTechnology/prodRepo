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
    
    logger.debug(f"User authenticated: {user.email} (role: {user.role.value})")
    
    return CurrentUser(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role
    )

def require_role(allowed_roles: list[UserRole]):
    """
    Dependency factory to require specific roles.
    
    Args:
        allowed_roles: List of allowed roles
    
    Returns:
        Dependency function that checks user role
    """
    def role_checker(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if current_user.role not in allowed_roles:
            logger.warning(f"User {current_user.email} attempted to access resource requiring roles: {allowed_roles}")
            raise ForbiddenException("Insufficient permissions")
        return current_user
    
    return role_checker

# Convenience dependencies
require_admin = require_role([UserRole.ADMIN])
require_user = require_role([UserRole.USER, UserRole.ADMIN])
