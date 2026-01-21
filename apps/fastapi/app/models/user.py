from sqlalchemy import Column, Integer, String, DateTime, TypeDecorator
from datetime import datetime
import enum
from app.core.database import Base

class UserRole(str, enum.Enum):
    """User role enumeration."""
    USER = "user"
    ADMIN = "admin"

class UserRoleType(TypeDecorator):
    """Custom type to handle UserRole enum conversion."""
    impl = String
    cache_ok = True
    
    def __init__(self):
        super().__init__(length=20)
    
    def process_bind_param(self, value, dialect):
        """Convert enum to string value when writing to database."""
        if value is None:
            return None
        if isinstance(value, UserRole):
            return value.value
        return value
    
    def process_result_value(self, value, dialect):
        """Convert string value to enum when reading from database."""
        if value is None:
            return None
        if isinstance(value, str):
            # Try to find enum by value
            for role in UserRole:
                if role.value == value:
                    return role
            # Fallback: try to find by name (uppercase)
            try:
                return UserRole[value.upper()]
            except KeyError:
                return UserRole.USER  # Default fallback
        return value

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(150), unique=True, nullable=False)
    full_name = Column(String(150), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(UserRoleType(), default=UserRole.USER, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
