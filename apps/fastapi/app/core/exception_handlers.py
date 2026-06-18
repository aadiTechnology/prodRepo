"""Global exception handlers for the FastAPI application."""
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from app.core.exceptions import AppException
from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)

async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """Handle custom application exceptions."""
    logger.error(f"Application error: {exc.message}", exc_info=True)
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message},
    )

async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handle request validation errors."""
    errors = exc.errors()
    logger.warning(f"Validation error: {errors}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "Validation error", "errors": errors},
    )

async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
    """Handle SQLAlchemy database errors."""
    logger.error(f"Database error: {str(exc)}", exc_info=True)
    
    if isinstance(exc, IntegrityError):
        raw = str(getattr(exc, "orig", exc) or exc)
        raw_lower = raw.lower()
        if "ck_homework_status" in raw_lower:
            detail = (
                "Homework status was rejected by the database. "
                "Deploy the latest API so Active/Draft map to published/draft."
            )
        elif "ck_homework_dates" in raw_lower:
            detail = "Submission date must be on or after the assigned date."
        elif "check constraint" in raw_lower:
            detail = "Database constraint rejected this request."
        elif "foreign key" in raw_lower:
            detail = "A related record was not found (invalid class, subject, teacher, or academic year)."
        elif any(token in raw_lower for token in ("duplicate", "unique key", "2627", "2601")):
            detail = "Database integrity error. Resource may already exist."
        else:
            detail = "Database integrity error. Resource may already exist."

        content: dict = {"detail": detail}
        if settings.DEBUG:
            content["driver_detail"] = raw[:800]
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content=content,
        )
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Database error occurred"},
    )

async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected exceptions."""
    logger.error(f"Unexpected error: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected error occurred"},
    )
