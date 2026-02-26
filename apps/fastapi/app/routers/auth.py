"""Authentication router."""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import timedelta
from app.core.database import get_db
from app.services.rbac_service import get_user_roles 
from app.schemas.auth import LoginRequest, TokenResponse, UserWithRole, LoginContextResponse
from app.schemas.user import UserCreate, UserResponse
from app.services import user_service, rbac_service
from app.models.user import UserRole
from app.utils.security import verify_password, create_access_token
from app.core.exceptions import UnauthorizedException, ForbiddenException
from app.core.logging_config import get_logger
from app.core.dependencies import get_current_user, CurrentUser, _get_rbac_role_codes
from app.services.auth_service import revoke_token

logger = get_logger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=201)
async def register(user_data: UserCreate, db: Session = Depends(get_db)) -> UserResponse:
    """Register a new user."""
    from app.models.user import User
    
    # Check if this is the first user
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
    
    # Strict Tenant/User Activation Check
    if not user.is_active:
        raise UnauthorizedException("Your account is deactivated. Contact system administrator.")
    
    if user.tenant_id:
        from app.models.tenant import Tenant
        tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
        if not tenant or not tenant.is_active or tenant.is_deleted:
            logger.warning(f"Login blocked: Tenant {user.tenant_id} is inactive or deleted (User: {user.email})")
            raise ForbiddenException("Tenant is deactivated. Contact system administrator.")

    # Resolve role from RBAC first
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

    # Strict Tenant/User Activation Check
    if not user.is_active:
        raise UnauthorizedException("Your account is deactivated. Contact system administrator.")
    
    if user.tenant_id:
        from app.models.tenant import Tenant
        tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
        if not tenant or not tenant.is_active or tenant.is_deleted:
            logger.warning(f"Login blocked (Context): Tenant {user.tenant_id} is inactive or deleted (User: {user.email})")
            raise ForbiddenException("Tenant is deactivated. Contact system administrator.")

    # Resolve roles BEFORE creating the token so they can be embedded
    roles = [role.code for role in get_user_roles(db, user.id)]
    user_role = roles[0] if roles else user.role.value

    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "role": user_role,
            "tenant_id": user.tenant_id,
        }
    )

    # Get permissions and menus
    permissions, menus = rbac_service.resolve_user_permissions_and_menus(db, user)
    logger.info(f"[RBAC] User logged in successfully: {user.email}. Role: {user_role}")
    return LoginContextResponse(
        access_token=access_token,
        user=UserWithRole(id=user.id, email=user.email, full_name=user.full_name, role=user.role),
        roles=roles,
        permissions=permissions,
        menus=menus,
    )

@router.get("/me", response_model=UserWithRole)
async def get_current_user_info(
    request: Request,
    current_user: CurrentUser = Depends(get_current_user)
) -> UserWithRole:
    """Get current authenticated user information."""
    return UserWithRole(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role
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
