from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import re

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings
from app.core.logging_config import get_logger


logger = get_logger(__name__)


# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


# JWT Token utilities
def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.

    Args:
        data: Dictionary containing the data to encode in the token (e.g., {"sub": user_id})
        expires_delta: Optional timedelta for token expiration. Defaults to settings value.

    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire, "iat": datetime.utcnow()})

    try:
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        return encoded_jwt
    except Exception as e:
        logger.error(f"Error creating access token: {str(e)}")
        raise


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decode and verify a JWT access token.

    Args:
        token: JWT token string to decode

    Returns:
        Dictionary containing the decoded token data, or None if invalid
    """
    if not token:
        logger.warning("Empty token provided to decode_access_token")
        return None

    try:
        # Log the SECRET_KEY length for debugging (not the actual key)
        logger.debug(f"Decoding token with SECRET_KEY length: {len(settings.SECRET_KEY)}, algorithm: {settings.ALGORITHM}")
        
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        logger.info(f"Token decoded successfully. User ID: {payload.get('sub')}, Expires at: {payload.get('exp')}")
        return payload
    except JWTError as e:
        # JWTError is the base class for all python-jose JWT errors
        logger.error(f"JWT decode error: {type(e).__name__}: {str(e)}")
        logger.error(f"SECRET_KEY being used (first 10 chars): {settings.SECRET_KEY[:10]}...")
        return None
    except Exception as e:
        logger.error(f"Unexpected error decoding token: {type(e).__name__}: {str(e)}")
        return None


def verify_token(token: str) -> bool:
    """
    Verify if a token is valid.

    Args:
        token: JWT token string to verify

    Returns:
        True if token is valid, False otherwise
    """
    payload = decode_access_token(token)
    return payload is not None


def validate_new_password(password: str) -> str | None:
    """
    Validate new password according to business rules.
    Returns None if valid, or error message string if invalid.
    """
    if len(password) < 8:
        return "New password must be at least 8 characters."
    if not re.search(r"[A-Za-z]", password):
        return "New password must contain at least one letter."
    if not re.search(r"\d", password):
        return "New password must contain at least one number."
    return None
