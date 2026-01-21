from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_admin, CurrentUser
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.services import user_service
from app.core.logging_config import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/users", tags=["Users"])

@router.post("/", response_model=UserResponse, status_code=201)
def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin)
) -> UserResponse:
    """Create a new user. Requires admin role."""
    logger.info(f"Admin {current_user.email} creating user: {user.email}")
    return user_service.create_user(db, user)

@router.get("/", response_model=list[UserResponse])
def read_all_users(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
) -> list[UserResponse]:
    """Get all users. Requires authentication."""
    logger.debug(f"User {current_user.email} fetching all users")
    return user_service.get_users(db)

@router.get("/{user_id}", response_model=UserResponse)
def read_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
) -> UserResponse:
    """Get a user by ID. Requires authentication."""
    logger.debug(f"User {current_user.email} fetching user: {user_id}")
    return user_service.get_user(db, user_id)

@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user: UserUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
) -> UserResponse:
    """Update a user. Users can update themselves, admins can update anyone."""
    # Users can only update themselves unless they're admin
    if current_user.role.value != "admin" and current_user.id != user_id:
        logger.warning(f"User {current_user.email} attempted to update user {user_id}")
        from app.core.exceptions import ForbiddenException
        raise ForbiddenException("You can only update your own profile")
    logger.info(f"User {current_user.email} updating user: {user_id}")
    return user_service.update_user(db, user_id, user)

@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin)
) -> dict:
    """Delete a user. Requires admin role."""
    logger.info(f"Admin {current_user.email} deleting user: {user_id}")
    user_service.delete_user(db, user_id)
    return {"message": "User deleted successfully"}
