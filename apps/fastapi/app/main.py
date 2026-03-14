from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
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
from fastapi.exceptions import RequestValidationError

# Import all models first to ensure SQLAlchemy relationships are properly configured
# This must happen before any database operations or router imports
from app.models import (  # noqa: F401
    Tenant,
    User,
    Role,
    Feature,
    Menu,
    ThemeTemplate,
)

from app.routers import user, auth, role, menu, feature, rbac, tenant, profile, ai, theme_template, fee, academic, class_fee_structure_assignment

from app.routers import fee_discount, fee_category_router

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


# CORS configuration - use FastAPI's built-in CORSMiddleware
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,  # Defined in config.py / .env CORS_ORIGINS
    allow_credentials=settings.CORS_CREDENTIALS,
    allow_methods=settings.CORS_METHODS,
    allow_headers=settings.CORS_HEADERS,
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
app.include_router(tenant.router)
app.include_router(role.router)
app.include_router(menu.router)
app.include_router(feature.router)
app.include_router(fee_discount.router)
app.include_router(theme_template.router)
app.include_router(fee.router)
app.include_router(fee_category_router.router)
app.include_router(rbac.router)
app.include_router(profile.router)
app.include_router(ai.router)
app.include_router(academic.router)
app.include_router(class_fee_structure_assignment.router)

# Mount static files for profile images
# Ensure the directory exists
import os
os.makedirs("static/profile-images", exist_ok=True)
app.mount("/profile-images", StaticFiles(directory="static/profile-images"), name="profile-images")

@app.on_event("startup")
async def startup_event():
    """Log application startup and initialize database tables."""
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"Debug mode: {settings.DEBUG}")
    
    # Create database tables on startup (not at import time)
    try:
        logger.info(f"Connecting to database...")
        Base.metadata.create_all(bind=engine)
        logger.info("[OK] Database tables initialized successfully")
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
    """
    Health check endpoint for monitoring and load balancers.
    Returns basic health status.
    """
    return {"status": "healthy"}


@app.get("/health/ready")
async def readiness_check():
    """
    Readiness probe endpoint.
    Checks if the application is ready to serve traffic.
    Verifies database connectivity.
    """
    from sqlalchemy import text
    from app.core.database import SessionLocal
    
    health_status = {
        "status": "ready",
        "checks": {
            "database": "unknown",
        },
        "timestamp": None,
    }
    
    try:
        from datetime import datetime
        health_status["timestamp"] = datetime.utcnow().isoformat()
        
        # Check database connectivity
        db = SessionLocal()
        try:
            # Simple query to verify database connection
            db.execute(text("SELECT 1"))
            health_status["checks"]["database"] = "healthy"
        except Exception as e:
            logger.error(f"Database health check failed: {str(e)}")
            health_status["checks"]["database"] = "unhealthy"
            health_status["status"] = "not_ready"
        finally:
            db.close()
        
        # If any check fails, return 503
        if health_status["status"] == "not_ready":
            from fastapi import status
            from fastapi.responses import JSONResponse
            return JSONResponse(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                content=health_status
            )
        
        return health_status
    except Exception as e:
        logger.error(f"Readiness check failed: {str(e)}")
        health_status["status"] = "error"
        health_status["error"] = str(e)
        from fastapi import status
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=health_status
        )


@app.get("/health/live")
async def liveness_check():
    """
    Liveness probe endpoint.
    Checks if the application is alive and should be restarted if not.
    """
    return {
        "status": "alive",
        "timestamp": None,
    }

    # ...existing code...
