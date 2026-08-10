from datetime import datetime, timedelta
from typing import List, Tuple, Dict, Any, Optional

from sqlalchemy.orm import Session
from app.models.revoked_token import RevokedToken
from app.models.user import User, UserRole
from app.models.tenant import Tenant
from app.services import profile_image_service
from app.schemas.auth import LoginContextResponse, TenantInfo, UserWithRole, AiAssistantPlanInfo, TokenResponse
from app.utils.security import (
    create_access_token,
    generate_refresh_token,
    hash_refresh_token,
)
from app.services import rbac_service, theme_template_service
from app.services.ai_permission_sync_service import get_effective_ai_plan_for_user
from app.core.exceptions import UnauthorizedException, ForbiddenException
from app.core.logging_config import get_logger
from app.core.config import settings
from app.repositories import refresh_token_repository

logger = get_logger(__name__)


def revoke_token(db: Session, token: str, user_id: int) -> None:
    """Add token to revoked_tokens table."""
    db.add(RevokedToken(token=token, user_id=user_id, revoked_at=datetime.utcnow()))
    db.commit()
    logger.info(f"Token revoked for user_id={user_id}: {token[:20]}...")


def _build_access_token_payload(
    user: User,
    resolved_role: str,
    *,
    is_impersonation: bool = False,
    original_user_id: Optional[int] = None,
) -> dict:
    token_data: dict = {
        "sub": str(user.id),
        "email": user.email,
        "role": resolved_role,
        "tenant_id": user.tenant_id,
        "is_impersonation": is_impersonation,
    }
    if is_impersonation and original_user_id:
        token_data["original_user_id"] = original_user_id
    return token_data


def issue_refresh_token(
    db: Session,
    user: User,
    *,
    is_impersonation: bool = False,
    original_user_id: Optional[int] = None,
) -> str:
    """Create a long-lived opaque refresh token and persist its hash."""
    raw = generate_refresh_token()
    token_hash = hash_refresh_token(raw)
    expires_at = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    refresh_token_repository.create_refresh_token_row(
        db,
        user_id=int(user.id),  # type: ignore[arg-type]
        token_hash=token_hash,
        expires_at=expires_at,
        is_impersonation=is_impersonation,
        original_user_id=original_user_id,
    )
    return raw


def issue_token_pair(
    db: Session,
    user: User,
    resolved_role: str,
    *,
    is_impersonation: bool = False,
    original_user_id: Optional[int] = None,
) -> TokenResponse:
    """Issue short-lived access JWT + long-lived refresh token."""
    access_token = create_access_token(
        data=_build_access_token_payload(
            user,
            resolved_role,
            is_impersonation=is_impersonation,
            original_user_id=original_user_id,
        )
    )
    refresh = issue_refresh_token(
        db,
        user,
        is_impersonation=is_impersonation,
        original_user_id=original_user_id,
    )
    return TokenResponse(access_token=access_token, refresh_token=refresh)


def refresh_with_refresh_token(db: Session, raw_refresh_token: str) -> TokenResponse:
    """
    Validate a refresh token, rotate it, and issue a new access + refresh pair.
    """
    if not raw_refresh_token or not raw_refresh_token.strip():
        raise UnauthorizedException("Refresh token is required")

    token_hash = hash_refresh_token(raw_refresh_token.strip())
    row = refresh_token_repository.get_valid_refresh_token(db, token_hash)
    if not row:
        raise UnauthorizedException("Invalid or expired refresh token")

    user = db.query(User).filter(User.id == row.user_id).first()
    if not user or not user.is_active or user.is_deleted:  # type: ignore[truthy-bool]
        refresh_token_repository.revoke_refresh_token_row(db, row)
        raise UnauthorizedException("Your account is deactivated. Contact system administrator.")

    if user.tenant_id is not None:
        tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
        if not tenant or not tenant.is_active or tenant.is_deleted:  # type: ignore[truthy-bool]
            refresh_token_repository.revoke_refresh_token_row(db, row)
            raise ForbiddenException("Tenant is deactivated. Contact system administrator.")

    # Rotate: revoke old refresh token before issuing a new pair
    refresh_token_repository.revoke_refresh_token_row(db, row)

    roles = rbac_service.get_user_roles(db, user.id)  # type: ignore[arg-type]
    resolved_role = roles[0].code if roles else (user.role.value if user.role else "USER")  # type: ignore[truthy-bool]

    is_impersonation = bool(row.is_impersonation)
    original_user_id = int(row.original_user_id) if row.original_user_id is not None else None

    return issue_token_pair(
        db,
        user,
        resolved_role,
        is_impersonation=is_impersonation,
        original_user_id=original_user_id,
    )


def revoke_refresh_token(db: Session, raw_refresh_token: Optional[str]) -> None:
    """Revoke a single refresh token (logout)."""
    if not raw_refresh_token or not raw_refresh_token.strip():
        return
    token_hash = hash_refresh_token(raw_refresh_token.strip())
    refresh_token_repository.revoke_refresh_token_by_hash(db, token_hash)


def get_login_context(
    db: Session, 
    user: User, 
    is_impersonation: bool = False, 
    original_user_id: Optional[int] = None,
    *,
    issue_tokens: bool = True,
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

    # 3. Profile Image Fetch (UserProfile + teacher/student photo fallback)
    profile_image_path = profile_image_service.ensure_user_profile_image_from_student(db, user.id)

    # 4. RBAC Resolution
    roles = [role.code for role in rbac_service.get_user_roles(db, user.id)]
    permissions, menus = rbac_service.resolve_user_permissions_and_menus(db, user)
    rbac_version = rbac_service.compute_rbac_version(db, user)

    # 5. Role Selection (Primary role for token)
    # Use roles[0] if available, else fall back to user.role enum
    resolved_role = roles[0] if roles else (user.role.value if hasattr(user, 'role') and user.role else "USER")

    # 6. Token pair Generation (only on login / impersonation — not on RBAC polls)
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    if issue_tokens:
        tokens = issue_token_pair(
            db,
            user,
            resolved_role,
            is_impersonation=is_impersonation,
            original_user_id=original_user_id,
        )
        access_token = tokens.access_token
        refresh_token = tokens.refresh_token

    ai_plan = None
    if user.tenant_id:
        plan = get_effective_ai_plan_for_user(db, user)
        ai_plan = AiAssistantPlanInfo(
            plan_tier=plan.plan_tier,
            ai_enabled=plan.ai_enabled,
            llm_enabled=plan.llm_enabled,
            monthly_llm_unit_cap=plan.monthly_llm_unit_cap,
        )

    # 7. Response Construction
    return LoginContextResponse(
        access_token=access_token,
        token_type="bearer",
        refresh_token=refresh_token,
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
        rbac_version=rbac_version,
        ai_assistant=ai_plan,
    )
