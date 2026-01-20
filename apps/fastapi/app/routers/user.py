from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.services import user_service
from app.core.logging_config import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/users", tags=["Users"])

@router.post("/", response_model=UserResponse, status_code=201)
def create_user(user: UserCreate, db: Session = Depends(get_db)) -> UserResponse:
    """Create a new user."""
    logger.info(f"Creating user: {user.email}")
    return user_service.create_user(db, user)

@router.get("/", response_model=list[UserResponse])
def read_all_users(db: Session = Depends(get_db)) -> list[UserResponse]:
    """Get all users."""
    logger.debug("Fetching all users")
    return user_service.get_users(db)

@router.get("/{user_id}", response_model=UserResponse)
def read_user(user_id: int, db: Session = Depends(get_db)) -> UserResponse:
    """Get a user by ID."""
    logger.debug(f"Fetching user: {user_id}")
    return user_service.get_user(db, user_id)

@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int, 
    user: UserUpdate, 
    db: Session = Depends(get_db)
) -> UserResponse:
    """Update a user."""
    logger.info(f"Updating user: {user_id}")
    return user_service.update_user(db, user_id, user)

@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    """Delete a user."""
    logger.info(f"Deleting user: {user_id}")
    user_service.delete_user(db, user_id)
    return {"message": "User deleted successfully"}
