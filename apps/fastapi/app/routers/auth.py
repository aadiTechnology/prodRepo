"""Authentication router."""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import timedelta
from app.core.database import get_db
from app.services.rbac_service import get_user_roles 
from app.schemas.auth import LoginRequest, TokenResponse, UserWithRole, LoginContextResponse, TenantInfo, RBACVersionResponse
from app.schemas.user import UserCreate, UserResponse
from app.services import user_service, rbac_service, auth_service, theme_template_service
from app.models.user import User, UserRole
from app.utils.security import verify_password, create_access_token
from app.core.exceptions import UnauthorizedException, ForbiddenException
from app.core.logging_config import get_logger
from app.core.dependencies import get_current_user, CurrentUser, get_rbac_role_codes, SYSTEM_ADMIN_ROLE_CODE
from app.services.auth_service import revoke_token
from app.models.tenant import Tenant

from typing import Optional

logger = get_logger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _assert_login_tenant_matches(db: Session, user: User, requested_tenant_id: Optional[int]) -> None:
    """
    School portal login: only users assigned to the selected tenant may sign in.
    System administrators (no tenant) must use /login without a school selection.
    """
    if requested_tenant_id is None:
        return

    school = (
        db.query(Tenant)
        .filter(
            Tenant.id == requested_tenant_id,
            Tenant.is_deleted == False,  # noqa: E712
            Tenant.is_active == True,  # noqa: E712
        )
        .first()
    )
    if not school:
        raise ForbiddenException("The selected school is not available. Please choose another school.")

    user_tenant_id = user.tenant_id
    school_name = school.name

    if user_tenant_id is None:
        raise ForbiddenException(
            f"This account is not registered with {school_name}. "
            "System administrators should sign in from the administrator login page."
        )

    if user_tenant_id != requested_tenant_id:  # type: ignore[truthy-bool]
        raise ForbiddenException(
            f"This account does not belong to {school_name}. "
            "Please select the correct school or contact your school administrator."
        )


def _has_full_user_management_access(db: Session, user) -> bool:
    permission_codes, _ = rbac_service.resolve_user_permissions_and_menus(db, user)
    required_permissions = {
        "ADMIN_MGMT:view",
        "ADMIN_MGMT:create",
        "ADMIN_MGMT:edit",
        "ADMIN_MGMT:delete",
    }
    return required_permissions.issubset(set(permission_codes))

@router.post("/register", response_model=UserResponse, status_code=201)
async def register(user_data: UserCreate, db: Session = Depends(get_db)) -> UserResponse:
    """Register a new user."""

    existing_users = db.query(User).count()
    is_first_user = existing_users == 0

    role = UserRole.ADMIN if is_first_user else UserRole.USER
    
    logger.info(f"Registering new user: {user_data.email} with role: {role.value}")
    created_user = user_service.create_user(db, user_data, role=role, created_by=None)
    
    if is_first_user:
        logger.info(f"First user created as admin: {created_user.email}")
    
    return UserResponse(
        id=created_user.id,  # type: ignore[arg-type]
        email=created_user.email,  # type: ignore[arg-type]
        full_name=created_user.full_name,  # type: ignore[arg-type]
        tenant_id=created_user.tenant_id,  # type: ignore[arg-type]
        phone_number=created_user.phone_number,  # type: ignore[arg-type]
        is_active=created_user.is_active,  # type: ignore[arg-type]
        created_at=created_user.created_at,  # type: ignore[arg-type]
    )

@router.post("/login", response_model=TokenResponse)
async def login(login_data: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    """Authenticate user and return JWT token."""
    logger.info(f"Login attempt for email: {login_data.email}")
    
    user = user_service.get_user_by_email(db, login_data.email)
    if user is None or not verify_password(login_data.password, user.hashed_password):  # type: ignore[arg-type]
        logger.warning(f"Invalid credentials for email: {login_data.email}")
        raise UnauthorizedException("Invalid email or password")

    _assert_login_tenant_matches(db, user, login_data.tenant_id)

    if not user.is_active:  # type: ignore[truthy-bool]
        raise UnauthorizedException("Your account is deactivated. Contact system administrator.")
    
    if user.tenant_id is not None:
        tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
        if not tenant or not tenant.is_active or tenant.is_deleted:  # type: ignore[truthy-bool]
            logger.warning(f"Login blocked: Tenant {user.tenant_id} is inactive or deleted (User: {user.email})")
            raise ForbiddenException("Tenant is deactivated. Contact system administrator.")
    
    user_role = user.roles[0].code if user.roles else user.role.value

    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "role": user_role,
            "tenant_id": user.tenant_id,
        }
    )
    
    logger.info(f"User logged in successfully: {user.email}. Role: {user_role}")
    return TokenResponse(access_token=access_token)

@router.post("/login/context", response_model=LoginContextResponse)
async def login_with_context(
    login_data: LoginRequest,
    db: Session = Depends(get_db),
) -> LoginContextResponse:
    """Unified authentication endpoint — returns JWT token plus RBAC context (roles, permissions, menus)."""
    logger.info(f"[RBAC] Login-with-context attempt for email: {login_data.email}")

    user = user_service.get_user_by_email(db, login_data.email)
    if user is None or not verify_password(login_data.password, user.hashed_password):  # type: ignore[arg-type]
        logger.warning(f"[RBAC] Invalid credentials for email: {login_data.email}")
        raise UnauthorizedException("Invalid email or password")

    _assert_login_tenant_matches(db, user, login_data.tenant_id)

    return auth_service.get_login_context(db, user)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_access_token(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> TokenResponse:
    """Issue a new access token for the current session (extends JWT lifetime)."""
    user = user_service.get_user_by_id(db, current_user.id)
    if not user or not user.is_active or user.is_deleted:  # type: ignore[truthy-bool]
        raise UnauthorizedException("Your account is deactivated. Contact system administrator.")

    roles = rbac_service.get_user_roles(db, user.id)  # type: ignore[arg-type]
    resolved_role = roles[0].code if roles else (user.role.value if user.role else "USER")  # type: ignore[truthy-bool]

    token_data: dict = {
        "sub": str(user.id),
        "email": user.email,
        "role": resolved_role,
        "tenant_id": user.tenant_id,
        "is_impersonation": current_user.is_impersonation,
    }
    if current_user.is_impersonation and current_user.original_user_id:
        token_data["original_user_id"] = current_user.original_user_id

    access_token = create_access_token(data=token_data)
    logger.info(f"Access token refreshed for user: {user.email}")
    return TokenResponse(access_token=access_token)


@router.get("/me", response_model=UserWithRole)
async def get_current_user_info(
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
) -> UserWithRole:
    """Get current authenticated user information."""
    tenant_info = None
    if current_user.tenant_id is not None:
        tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
        if tenant and tenant.is_active and not tenant.is_deleted:  # type: ignore[truthy-bool]
            theme_config = None
            theme_template_id = getattr(tenant, "theme_template_id", None)
            if theme_template_id is not None:
                theme_config = theme_template_service.get_template_config(db, theme_template_id)
            tenant_info = TenantInfo(
                id=tenant.id,  # type: ignore[arg-type]
                name=tenant.name,  # type: ignore[arg-type]
                code=tenant.code,  # type: ignore[arg-type]
                logo_url=tenant.logo_url,  # type: ignore[arg-type]
                theme_template_id=getattr(tenant, "theme_template_id", None),
                theme_config=theme_config,
                address_line1=tenant.address_line1,  # type: ignore[arg-type]
                address_line2=tenant.address_line2,  # type: ignore[arg-type]
                city=tenant.city,  # type: ignore[arg-type]
                state=tenant.state,  # type: ignore[arg-type]
                pin_code=tenant.pin_code,  # type: ignore[arg-type]
            )

    return UserWithRole(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        tenant_id=current_user.tenant_id,
        tenant=tenant_info,
        is_impersonation=current_user.is_impersonation,
        original_user_id=current_user.original_user_id,
    )

@router.post("/logout")
async def logout(
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Revoke the current JWT token and log the user out."""
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.split()[1] if auth_header.startswith("Bearer ") else None
    if token:
        revoke_token(db, token, current_user.id)
        logger.info(f"User logged out: {current_user.email}")
    return {"message": "Logged out successfully"}


@router.get("/rbac/version", response_model=RBACVersionResponse)
async def get_rbac_version(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> RBACVersionResponse:
    """
    Lightweight poll endpoint — returns only the current rbac_version string.
    Clients should call this frequently; fetch /rbac/context only when version changes.
    """
    user = user_service.get_user_by_id(db, current_user.id)
    if not user:
        raise UnauthorizedException("User not found")
    version = rbac_service.compute_rbac_version(db, user)
    return RBACVersionResponse(version=version)


@router.get("/rbac/context", response_model=LoginContextResponse)
async def get_rbac_context(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
) -> LoginContextResponse:
    """Get the current user's RBAC context (roles, permissions, menus)."""
    user = user_service.get_user_by_id(db, current_user.id)
    if not user:
        raise UnauthorizedException("User not found")
        
    return auth_service.get_login_context(db, user)

@router.post("/impersonate/{user_id}", response_model=LoginContextResponse)
async def impersonate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> LoginContextResponse:
    """
    Impersonate another user.
    - System admin (tenant_id is None) can impersonate tenant users.
    - Tenant users can impersonate only users of the same tenant when they have
      full User Management permissions.
    """
    logger.info(f"Impersonation attempt: actor={current_user.id} target={user_id}")
    
    actor_user = user_service.get_user_by_id(db, current_user.id)
    if not actor_user:
        raise UnauthorizedException("Actor user not found")

    actor_is_system_admin = (
        current_user.tenant_id is None
        and (
            current_user.role in [UserRole.ADMIN, UserRole.SUPER_ADMIN]
            or SYSTEM_ADMIN_ROLE_CODE.lower() in get_rbac_role_codes(db, current_user.id)
        )
    )

    target_user = user_service.get_user_by_id(db, user_id)
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    if not target_user.is_active:  # type: ignore[truthy-bool]
        raise ForbiddenException("Cannot impersonate inactive user")
    
    if target_user.tenant_id is None:
        raise ForbiddenException("Cannot impersonate system administrators")

    if not actor_is_system_admin:
        if current_user.tenant_id is None:
            raise ForbiddenException("Insufficient permissions")
        if target_user.tenant_id != current_user.tenant_id:  # type: ignore[truthy-bool]
            raise ForbiddenException("You can only login as users from your tenant")
        if not _has_full_user_management_access(db, actor_user):
            raise ForbiddenException(
                "Insufficient permissions. Full User Management access is required."
            )
    
    tenant = db.query(Tenant).filter(Tenant.id == target_user.tenant_id).first()
    if not tenant or not tenant.is_active or tenant.is_deleted:  # type: ignore[truthy-bool]
        raise ForbiddenException("Cannot impersonate user from inactive tenant")
    
    return auth_service.get_login_context(
        db, 
        target_user, 
        is_impersonation=True, 
        original_user_id=current_user.id
    )

@router.post("/exit-impersonation", response_model=LoginContextResponse)
async def exit_impersonation(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> LoginContextResponse:
    """Exit impersonation and return to original system admin session."""
    if not hasattr(current_user, 'is_impersonation') or not current_user.is_impersonation:
        raise ForbiddenException("Not currently in impersonation mode")
    
    if current_user.original_user_id is None:
        raise ForbiddenException("Original user ID not available")
    
    original_user = user_service.get_user_by_id(db, current_user.original_user_id)
    if not original_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Original user not found")
    
    return auth_service.get_login_context(db, original_user)
