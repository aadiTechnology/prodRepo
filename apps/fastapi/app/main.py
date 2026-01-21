from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from sqlalchemy.exc import SQLAlchemyError
from app.core.database import Base, engine, DATABASE_URL
from app.core.config import settings
from app.core.logging_config import setup_logging, get_logger
from app.core.exceptions import AppException
from app.core.exception_handlers import (
    app_exception_handler,
    validation_exception_handler,
    sqlalchemy_exception_handler,
    generic_exception_handler,
)
from app.routers import user, auth
from fastapi.exceptions import RequestValidationError

# Setup logging first
setup_logging()
logger = get_logger(__name__)

# Initialize FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
)

# Compression middleware - reduces response size for better performance
# Should be added before other middleware for optimal performance
app.add_middleware(
    GZipMiddleware,
    minimum_size=1000,  # Only compress responses larger than 1KB
)

# CORS configuration - optimized for performance
# Order matters: CORS should be added after compression but before other middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,  # Specific origins instead of "*" for better security
    allow_credentials=settings.CORS_CREDENTIALS,
    allow_methods=settings.CORS_METHODS,  # Can be optimized to specific methods: ["GET", "POST", "PUT", "DELETE"]
    allow_headers=settings.CORS_HEADERS,  # Can be optimized to specific headers: ["Content-Type", "Authorization"]
    expose_headers=["Content-Length", "X-Request-ID"],  # Expose useful headers to client
    max_age=3600,  # Cache preflight requests for 1 hour
)

# Register exception handlers
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# Include routers
# Note: API_V1_PREFIX is available for future versioning, but not used here to maintain backward compatibility
app.include_router(auth.router)
app.include_router(user.router)

@app.on_event("startup")
async def startup_event():
    """Log application startup and initialize database tables."""
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"Debug mode: {settings.DEBUG}")
    
    # Create database tables on startup (not at import time)
    try:
        logger.info(f"Connecting to database...")
        Base.metadata.create_all(bind=engine)
        logger.info("✓ Database tables initialized successfully")
    except Exception as e:
        logger.error(f"✗ Failed to initialize database tables")
        logger.error(f"  Error: {str(e)}")
        logger.warning("  Application will continue, but database operations may fail")
        logger.info("  To fix:")
        logger.info("    1. Ensure SQL Server is running")
        logger.info("    2. Check DB_SERVER and DB_NAME in .env file")
        logger.info("    3. Verify SQL Server instance name is correct")
        # Safely show connection info (mask credentials)
        conn_info = DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL
        logger.info(f"    4. Current connection target: {conn_info}")

@app.on_event("shutdown")
async def shutdown_event():
    """Log application shutdown."""
    logger.info(f"Shutting down {settings.APP_NAME}")

@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "version": settings.APP_VERSION,
        "docs": "/docs",
    }

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
