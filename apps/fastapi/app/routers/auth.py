"""Authentication router."""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import timedelta
from app.core.database import get_db
from app.services.rbac_service import get_user_roles 
from app.schemas.auth import LoginRequest, TokenResponse, UserWithRole, LoginContextResponse, TenantInfo
from app.schemas.user import UserCreate, UserResponse
from app.services import user_service, rbac_service, auth_service, theme_template_service
from app.models.user import UserRole
from app.utils.security import verify_password, create_access_token
from app.core.exceptions import UnauthorizedException, ForbiddenException
from app.core.logging_config import get_logger
from app.core.dependencies import get_current_user, CurrentUser, get_rbac_role_codes, require_system_admin
from app.services.auth_service import revoke_token
from app.models.tenant import Tenant

logger = get_logger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=201)
async def register(user_data: UserCreate, db: Session = Depends(get_db)) -> UserResponse:
    """Register a new user."""
    from app.models.user import User
    
    existing_users = db.query(User).count()
    is_first_user = existing_users == 0
    
    role = UserRole.ADMIN if is_first_user else UserRole.USER
    
    logger.info(f"Registering new user: {user_data.email} with role: {role.value}")
    created_user = user_service.create_user(db, user_data, role=role, created_by=None)
    
    if is_first_user:
        logger.info(f"First user created as admin: {created_user.email}")
    
    return UserResponse(
        id=created_user.id,
        email=created_user.email,
        full_name=created_user.full_name,
        tenant_id=created_user.tenant_id,
        phone_number=created_user.phone_number,
        is_active=created_user.is_active,
        created_at=created_user.created_at,
    )

@router.post("/login", response_model=TokenResponse)
async def login(login_data: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    """Authenticate user and return JWT token."""
    logger.info(f"Login attempt for email: {login_data.email}")
    
    user = user_service.get_user_by_email(db, login_data.email)
    if not user or not verify_password(login_data.password, user.hashed_password):
        logger.warning(f"Invalid credentials for email: {login_data.email}")
        raise UnauthorizedException("Invalid email or password")
    
    if not user.is_active:
        raise UnauthorizedException("Your account is deactivated. Contact system administrator.")
    
    if user.tenant_id:
        from app.models.tenant import Tenant
        tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
        if not tenant or not tenant.is_active or tenant.is_deleted:
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
    if not user or not verify_password(login_data.password, user.hashed_password):
        logger.warning(f"[RBAC] Invalid credentials for email: {login_data.email}")
        raise UnauthorizedException("Invalid email or password")

    return auth_service.get_login_context(db, user)

@router.get("/me", response_model=UserWithRole)
async def get_current_user_info(
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
) -> UserWithRole:
    """Get current authenticated user information."""
    tenant_info = None
    if current_user.tenant_id:
        from app.models.tenant import Tenant
        tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
        if tenant and tenant.is_active and not tenant.is_deleted:
            theme_config = None
            if getattr(tenant, "theme_template_id", None):
                theme_config = theme_template_service.get_template_config(db, tenant.theme_template_id)
            tenant_info = TenantInfo(
                id=tenant.id,
                name=tenant.name,
                code=tenant.code,
                logo_url=tenant.logo_url,
                theme_template_id=getattr(tenant, "theme_template_id", None),
                theme_config=theme_config,
                address_line1=tenant.address_line1,
                address_line2=tenant.address_line2,
                city=tenant.city,
                state=tenant.state,
                pin_code=tenant.pin_code,
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

@router.post("/impersonate/{user_id}", response_model=LoginContextResponse)
async def impersonate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_system_admin),
) -> LoginContextResponse:
    """
    System admin impersonates another user.
    Only system admins (users with no tenant_id) can impersonate other users.
    """
    logger.info(f"Impersonation attempt: System admin {current_user.id} trying to impersonate user {user_id}")
    
    if current_user.tenant_id is not None:
        raise ForbiddenException("Only system administrators can impersonate users")
    
    target_user = user_service.get_user_by_id(db, user_id)
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    if not target_user.is_active:
        raise ForbiddenException("Cannot impersonate inactive user")
    
    if target_user.tenant_id is None:
        raise ForbiddenException("Cannot impersonate system administrators")
    
    tenant = db.query(Tenant).filter(Tenant.id == target_user.tenant_id).first()
    if not tenant or not tenant.is_active or tenant.is_deleted:
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
    
    original_user = user_service.get_user_by_id(db, current_user.original_user_id)
    if not original_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Original user not found")
    
    return auth_service.get_login_context(db, original_user)
