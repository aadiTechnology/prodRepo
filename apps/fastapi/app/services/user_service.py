from datetime import datetime

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserUpdate
from app.utils.security import hash_password
from app.core.exceptions import NotFoundException, ConflictException
from app.core.logging_config import get_logger

logger = get_logger(__name__)


def create_user(
    db: Session,
    user: UserCreate,
    role: UserRole = UserRole.USER,
    created_by: int | None = None,
) -> User:
    """Create a new user."""
    try:
        db_user = User(
            email=user.email,
            full_name=user.full_name,
            hashed_password=hash_password(user.password),
            role=role,
            tenant_id=user.tenant_id,
            phone_number=user.phone_number,
            is_active=True,
            created_by=created_by,
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        logger.info(f"User created successfully: {db_user.email} with role {db_user.role.value}")
        return db_user
    except IntegrityError:
        db.rollback()
        logger.warning(f"Attempt to create user with existing email: {user.email}")
        raise ConflictException(f"User with email {user.email} already exists")


def get_users(db: Session) -> list[User]:
    """Get all non-deleted users."""
    users = db.query(User).filter(User.is_deleted == False).all()  # noqa: E712
    logger.debug(f"Retrieved {len(users)} users")
    return users


def get_user(db: Session, user_id: int) -> User:
    """Get a user by ID (excluding soft-deleted)."""
    user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()  # noqa: E712
    if not user:
        logger.warning(f"User not found: {user_id}")
        raise NotFoundException("User", user_id)
    return user


def get_user_by_email(db: Session, email: str) -> User | None:
    """Get a user by email (excluding soft-deleted)."""
    return db.query(User).filter(User.email == email, User.is_deleted == False).first()  # noqa: E712


def update_user(
    db: Session,
    user_id: int,
    user: UserUpdate,
    updated_by: int | None = None,
) -> User:
    """Update a user."""
    db_user = get_user(db, user_id)  # This will raise NotFoundException if not found

    if user.full_name is not None:
        db_user.full_name = user.full_name
    if user.phone_number is not None:
        db_user.phone_number = user.phone_number
    if user.is_active is not None:
        db_user.is_active = user.is_active
    if user.tenant_id is not None:
        db_user.tenant_id = user.tenant_id

    db_user.updated_by = updated_by
    db_user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_user)
    logger.info(f"User updated: {db_user.email}")
    return db_user


def soft_delete_user(db: Session, user_id: int, deleted_by: int | None = None) -> None:
    """Soft delete a user."""
    db_user = get_user(db, user_id)  # This will raise NotFoundException if not found
    db_user.is_deleted = True
    db_user.deleted_at = datetime.utcnow()
    db_user.deleted_by = deleted_by
    db.commit()
    logger.info(f"User soft-deleted: {db_user.email} (id={user_id})")


# Legacy function name for backward compatibility
def delete_user(db: Session, user_id: int) -> bool:
    """Soft delete a user (legacy function name for backward compatibility)."""
    soft_delete_user(db, user_id)
    return True
