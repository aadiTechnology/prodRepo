"""Authentication router."""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import timedelta
from app.core.database import get_db
from app.schemas.auth import LoginRequest, TokenResponse, UserWithRole
from app.schemas.user import UserCreate, UserResponse
from app.services import user_service
from app.models.user import UserRole
from app.utils.security import verify_password, create_access_token
from app.core.exceptions import UnauthorizedException
from app.core.logging_config import get_logger
from app.core.dependencies import get_current_user, CurrentUser

logger = get_logger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=201)
def register(user_data: UserCreate, db: Session = Depends(get_db)) -> UserResponse:
    """
    Register a new user.
    
    If no users exist in the database, the first user will be created as an admin.
    Subsequent registrations will create regular users.
    
    Args:
        user_data: User registration data (email, full_name, password)
        db: Database session
    
    Returns:
        UserResponse: Created user information
    """
    from app.models.user import User
    
    # Check if this is the first user (no users in database)
    existing_users = db.query(User).count()
    is_first_user = existing_users == 0
    
    # First user becomes admin, others are regular users
    role = UserRole.ADMIN if is_first_user else UserRole.USER
    
    logger.info(f"Registering new user: {user_data.email} with role: {role.value}")
    created_user = user_service.create_user(db, user_data, role=role)
    
    if is_first_user:
        logger.info(f"First user created as admin: {created_user.email}")
    
    return UserResponse(
        id=created_user.id,
        email=created_user.email,
        full_name=created_user.full_name
    )

@router.post("/login", response_model=TokenResponse)
def login(login_data: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    """
    Authenticate user and return JWT token.
    
    Args:
        login_data: Login credentials (email and password)
        db: Database session
    
    Returns:
        TokenResponse: JWT access token
    
    Raises:
        UnauthorizedException: If credentials are invalid
    """
    logger.info(f"Login attempt for email: {login_data.email}")
    
    # Get user by email
    user = user_service.get_user_by_email(db, login_data.email)
    if not user:
        logger.warning(f"Login attempt with non-existent email: {login_data.email}")
        raise UnauthorizedException("Invalid email or password")
    
    # Verify password
    if not verify_password(login_data.password, user.hashed_password):
        logger.warning(f"Invalid password attempt for email: {login_data.email}")
        raise UnauthorizedException("Invalid email or password")
    
    # Create access token
    # Note: JWT 'sub' claim must be a string, so convert user.id to string
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role.value}
    )
    
    logger.info(f"User logged in successfully: {user.email}. Token created (length: {len(access_token)})")
    return TokenResponse(access_token=access_token)

@router.get("/me", response_model=UserWithRole)
def get_current_user_info(
    request: Request,
    current_user: CurrentUser = Depends(get_current_user)
) -> UserWithRole:
    """
    Get current authenticated user information.
    
    Args:
        request: FastAPI request object
        current_user: Current authenticated user (from dependency)
    
    Returns:
        UserWithRole: Current user information
    """
    # Log the authorization header for debugging (without exposing the full token)
    auth_header = request.headers.get("Authorization", "")
    if auth_header:
        logger.debug(f"Authorization header present (length: {len(auth_header)})")
    else:
        logger.warning("No Authorization header in request")
    
    return UserWithRole(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role
    )
