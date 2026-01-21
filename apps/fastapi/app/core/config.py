from pydantic_settings import BaseSettings
from pydantic import field_validator, Field
from typing import List
import os

class Settings(BaseSettings):
    """
    Centralized application settings with environment variable support.
    Includes validation for production readiness.
    """
    
    # Application
    APP_NAME: str = "FastAPI SQL Server CRUD"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = Field(default="development", description="Environment: development, staging, production")
    
    # Database
    DB_SERVER: str = ""
    DB_NAME: str = ""
    DB_USER: str = ""
    DB_PASSWORD: str = ""
    DB_DRIVER: str = "ODBC Driver 18 for SQL Server"
    DB_ECHO: bool = False
    
    # CORS - Optimized for better security and performance
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    CORS_CREDENTIALS: bool = True
    CORS_METHODS: List[str] = ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]
    CORS_HEADERS: List[str] = ["Content-Type", "Authorization", "Accept", "X-Requested-With"]
    
    # JWT Authentication
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    ENABLE_FILE_LOGGING: bool = False
    
    @field_validator("ENVIRONMENT")
    @classmethod
    def validate_environment(cls, v: str) -> str:
        """Validate environment value."""
        allowed = ["development", "staging", "production"]
        if v.lower() not in allowed:
            raise ValueError(f"ENVIRONMENT must be one of {allowed}")
        return v.lower()
    
    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        """Validate SECRET_KEY for production."""
        # Note: Environment check is done in validate_production_settings()
        # This validator only checks format
        return v
    
    @field_validator("LOG_LEVEL")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        """Validate log level."""
        allowed = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if v.upper() not in allowed:
            raise ValueError(f"LOG_LEVEL must be one of {allowed}")
        return v.upper()
    
    @field_validator("ACCESS_TOKEN_EXPIRE_MINUTES")
    @classmethod
    def validate_token_expiry(cls, v: int) -> int:
        """Validate token expiry time."""
        if v < 1 or v > 1440:  # Between 1 minute and 24 hours
            raise ValueError("ACCESS_TOKEN_EXPIRE_MINUTES must be between 1 and 1440")
        return v
    
    def validate_production_settings(self) -> List[str]:
        """
        Validate settings for production deployment.
        Returns list of validation errors (empty if valid).
        """
        errors = []
        
        if self.ENVIRONMENT == "production":
            # Database validation
            if not self.DB_SERVER or not self.DB_NAME:
                errors.append("DB_SERVER and DB_NAME are required in production")
            
            # Security validation
            if self.SECRET_KEY == "your-secret-key-change-in-production":
                errors.append("SECRET_KEY must be changed from default in production")
            
            if len(self.SECRET_KEY) < 32:
                errors.append("SECRET_KEY must be at least 32 characters in production")
            
            if self.DEBUG:
                errors.append("DEBUG must be False in production")
            
            # CORS validation
            if "*" in self.CORS_ORIGINS:
                errors.append("CORS_ORIGINS should not contain '*' in production")
        
        return errors
    
    class Config:
        env_file = ".env"
        case_sensitive = True

# Create settings instance
settings = Settings()

# Validate settings on import (only in production)
if settings.ENVIRONMENT == "production":
    validation_errors = settings.validate_production_settings()
    if validation_errors:
        import sys
        print("ERROR: Production settings validation failed:", file=sys.stderr)
        for error in validation_errors:
            print(f"  - {error}", file=sys.stderr)
        sys.exit(1)
