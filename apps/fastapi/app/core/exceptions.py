"""Custom exceptions for the application."""
from fastapi import HTTPException, status
from typing import Any, Optional

class AppException(Exception):
    """Base exception for application-specific errors."""
    def __init__(self, message: str, status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)

class NotFoundException(AppException):
    """Exception raised when a resource is not found."""
    def __init__(self, resource: str = "Resource", identifier: Optional[Any] = None):
        message = f"{resource} not found"
        if identifier is not None:
            message += f": {identifier}"
        super().__init__(message, status_code=status.HTTP_404_NOT_FOUND)

class ValidationException(AppException):
    """Exception raised for validation errors."""
    def __init__(self, message: str):
        super().__init__(message, status_code=status.HTTP_422_UNPROCESSABLE_ENTITY)

class ConflictException(AppException):
    """Exception raised when a resource conflict occurs."""
    def __init__(self, message: str):
        super().__init__(message, status_code=status.HTTP_409_CONFLICT)

class UnauthorizedException(AppException):
    """Exception raised for authentication/authorization errors."""
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(message, status_code=status.HTTP_401_UNAUTHORIZED)

class ForbiddenException(AppException):
    """Exception raised when access is forbidden."""
    def __init__(self, message: str = "Forbidden"):
        super().__init__(message, status_code=status.HTTP_403_FORBIDDEN)
