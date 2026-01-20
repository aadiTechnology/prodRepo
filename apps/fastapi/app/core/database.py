from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings
from app.core.logging_config import get_logger
from urllib.parse import quote_plus
import os

logger = get_logger(__name__)

def get_database_url() -> str:
    """Build database URL from settings or use fallback for local development."""
    # Check for explicit database URL in environment (highest priority)
    explicit_url = os.getenv("DATABASE_URL")
    if explicit_url:
        logger.info("Using DATABASE_URL from environment")
        return explicit_url
    
    # Use settings if configured
    if settings.DB_SERVER and settings.DB_NAME:
        server = settings.DB_SERVER  # Keep backslashes as-is
        db_name = settings.DB_NAME
        
        if settings.DB_USER and settings.DB_PASSWORD:
            # Authenticated connection
            logger.info(f"Using authenticated connection to {server}/{db_name}")
            # IMPORTANT: Don't URL-encode server name - backslashes in SERVER\INSTANCE 
            # must remain as-is for pyodbc to work correctly
            return (
                f"mssql+pyodbc://{settings.DB_USER}:{quote_plus(settings.DB_PASSWORD)}"
                f"@{server}/{db_name}"
                f"?driver={quote_plus(settings.DB_DRIVER)}"
                "&TrustServerCertificate=yes"
            )
        else:
            # Windows Authentication
            logger.info(f"Using Windows Authentication to {server}/{db_name}")
            # IMPORTANT: Don't URL-encode server name - backslashes in SERVER\INSTANCE 
            # must remain as-is for pyodbc to work correctly
            return (
                f"mssql+pyodbc://{server}/{db_name}"
                f"?driver={quote_plus(settings.DB_DRIVER)}"
                "&Trusted_Connection=yes&TrustServerCertificate=yes"
            )
    else:
        # Fallback for local development (maintains existing behavior)
        computer_name = os.getenv("COMPUTERNAME", "localhost")
        fallback_server = f"{computer_name}\\SQLEXPRESS"
        logger.warning(f"Using fallback connection string. Consider setting DB_SERVER and DB_NAME in .env")
        logger.info(f"Attempting connection to: {fallback_server}/erpdb")
        # IMPORTANT: Don't URL-encode server name - backslashes must remain as-is
        return (
            f"mssql+pyodbc://{fallback_server}/erpdb"
            f"?driver={quote_plus(settings.DB_DRIVER)}"
            "&Trusted_Connection=yes&TrustServerCertificate=yes"
        )

DATABASE_URL = get_database_url()

# Create engine with connection pool settings
# pool_pre_ping=True helps detect stale connections
# pool_recycle prevents connection timeouts
engine = create_engine(
    DATABASE_URL,
    echo=settings.DB_ECHO,
    pool_pre_ping=True,  # Verify connections before using them
    pool_recycle=3600,   # Recycle connections after 1 hour
    connect_args={
        "timeout": 10,   # Connection timeout in seconds
    }
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """Dependency for getting database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
