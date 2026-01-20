from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.utils.security import hash_password
from app.core.exceptions import NotFoundException, ConflictException
from app.core.logging_config import get_logger

logger = get_logger(__name__)

def create_user(db: Session, user: UserCreate) -> User:
    """Create a new user."""
    try:
        db_user = User(
            email=user.email,
            full_name=user.full_name,
            hashed_password=hash_password(user.password)
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        logger.info(f"User created successfully: {db_user.email}")
        return db_user
    except IntegrityError:
        db.rollback()
        logger.warning(f"Attempt to create user with existing email: {user.email}")
        raise ConflictException(f"User with email {user.email} already exists")

def get_users(db: Session) -> list[User]:
    """Get all users."""
    users = db.query(User).all()
    logger.debug(f"Retrieved {len(users)} users")
    return users

def get_user(db: Session, user_id: int) -> User:
    """Get a user by ID."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        logger.warning(f"User not found: {user_id}")
        raise NotFoundException("User", user_id)
    return user

def get_user_by_email(db: Session, email: str) -> User | None:
    """Get a user by email."""
    return db.query(User).filter(User.email == email).first()

def update_user(db: Session, user_id: int, user: UserUpdate) -> User:
    """Update a user."""
    db_user = get_user(db, user_id)  # This will raise NotFoundException if not found
    db_user.full_name = user.full_name
    db.commit()
    db.refresh(db_user)
    logger.info(f"User updated: {db_user.email}")
    return db_user

def delete_user(db: Session, user_id: int) -> bool:
    """Delete a user."""
    db_user = get_user(db, user_id)  # This will raise NotFoundException if not found
    db.delete(db_user)
    db.commit()
    logger.info(f"User deleted: {db_user.email}")
    return True
