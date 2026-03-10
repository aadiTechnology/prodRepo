from datetime import datetime, timedelta
from typing import List, Tuple, Dict, Any, Optional

from sqlalchemy.orm import Session
from app.models.revoked_token import RevokedToken
from app.models.user import User, UserRole
from app.models.tenant import Tenant
from app.models.user_profile import UserProfile
from app.schemas.auth import LoginContextResponse, TenantInfo, UserWithRole
from app.utils.security import create_access_token
from app.services import rbac_service, theme_template_service
from app.core.exceptions import UnauthorizedException, ForbiddenException
from app.core.logging_config import get_logger

logger = get_logger(__name__)

def revoke_token(db: Session, token: str, user_id: int) -> None:
    """Add token to revoked_tokens table."""
    db.add(RevokedToken(token=token, user_id=user_id, revoked_at=datetime.utcnow()))
    db.commit()
    logger.info(f"Token revoked for user_id={user_id}: {token[:20]}...")

def get_login_context(
    db: Session, 
    user: User, 
    is_impersonation: bool = False, 
    original_user_id: Optional[int] = None
) -> LoginContextResponse:
    """
    Centralized logic to generate login context (token, roles, permissions, menus).
    Performs activation checks for user and tenant.
    """
    # 1. User Activation Check
    if not user.is_active or user.is_deleted:
        logger.warning(f"Auth failed: User {user.email} is inactive or deleted.")
        raise UnauthorizedException("Your account is deactivated. Contact system administrator.")

    # 2. Tenant Activation Check
    tenant_info = None
    if user.tenant_id:
        tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
        if not tenant or not tenant.is_active or tenant.is_deleted:
            logger.warning(f"Auth failed: Tenant {user.tenant_id} is inactive or deleted (User: {user.email})")
            raise ForbiddenException("Tenant is deactivated. Contact system administrator.")
        
        tenant_info = TenantInfo(
            id=tenant.id,
            name=tenant.name,
            code=tenant.code,
            logo_url=tenant.logo_url,
            address_line1=tenant.address_line1,
            address_line2=tenant.address_line2,
            city=tenant.city,
            state=tenant.state,
            pin_code=tenant.pin_code,
            theme_template_id=getattr(tenant, "theme_template_id", None),
            theme_config=theme_template_service.get_template_config(db, tenant.theme_template_id) if getattr(tenant, "theme_template_id", None) else None,
        )

    # 3. Profile Image Fetch
    profile = db.query(UserProfile).filter(UserProfile.UserId == user.id).first()
    profile_image_path = profile.ProfileImagePath if profile else None

    # 4. RBAC Resolution
    roles = [role.code for role in rbac_service.get_user_roles(db, user.id)]
    permissions, menus = rbac_service.resolve_user_permissions_and_menus(db, user)

    # 5. Role Selection (Primary role for token)
    # Use roles[0] if available, else fall back to user.role enum
    resolved_role = roles[0] if roles else (user.role.value if hasattr(user, 'role') and user.role else "USER")

    # 6. Token Generation
    token_data = {
        "sub": str(user.id),
        "email": user.email,
        "role": resolved_role,
        "tenant_id": user.tenant_id,
        "is_impersonation": is_impersonation,
    }
    if is_impersonation and original_user_id:
        token_data["original_user_id"] = original_user_id

    access_token = create_access_token(data=token_data)

    # 7. Response Construction
    return LoginContextResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserWithRole(
            id=user.id, 
            email=user.email, 
            full_name=user.full_name, 
            role=user.role, 
            tenant_id=user.tenant_id, 
            tenant=tenant_info,
            profile_image_path=profile_image_path,
            is_impersonation=is_impersonation,
            original_user_id=original_user_id
        ),
        roles=roles,
        permissions=permissions,
        menus=menus,
        tenant=tenant_info,
    )
