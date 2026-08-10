from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator, Field, computed_field
from typing import List
import os
from dotenv import load_dotenv

load_dotenv(os.getenv("ENV_FILE", ".env"))

class Settings(BaseSettings):
    """
    Centralized application settings with environment variable support.
    Includes validation for production readiness.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
    )

    # Application
    APP_NAME: str = "FastAPI SQL Server CRUD"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = Field(default="development", description="Environment: development, test, staging, production")
    
    # Database
    DB_SERVER: str = ""
    DB_NAME: str = ""
    DB_USER: str = ""
    DB_PASSWORD: str = ""
    DB_DRIVER: str = "ODBC Driver 18 for SQL Server"
    DB_ECHO: bool = False
   
    # CORS - comma-separated string in .env (parsed to list via CORS_ORIGINS property)
    CORS_ORIGINS_STR: str = Field(
        default="http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173,https://localhost,http://localhost,capacitor://localhost,http://erpui.aaditechnology.com,https://erpui.aaditechnology.com,http://erpui1.aaditechnology.com,https://app.smartkidzwakad.com",
        validation_alias="CORS_ORIGINS",
    )
    CORS_CREDENTIALS: bool = True
    CORS_METHODS: List[str] = ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]
    CORS_HEADERS: List[str] = ["Content-Type", "Authorization", "Accept", "X-Requested-With"]

    @computed_field
    @property
    def CORS_ORIGINS(self) -> List[str]:
        return [x.strip() for x in self.CORS_ORIGINS_STR.split(",") if x.strip()]
    
    OPENAI_API_KEY: str = Field(default="", description="OpenAI API key for AI assistant navigation")
    OPENAI_BASE_URL: str = Field(
        default="https://api.openai.com/v1",
        description="OpenAI API base URL (optional; for Azure/OpenAI-compatible proxies)",
    )
    OPENAI_MODEL: str = Field(default="gpt-4o-mini", description="OpenAI chat model for AI assistant")
    AI_NAV_MAX_OUTPUT_TOKENS: int = Field(default=150, description="Max completion tokens per navigation AI call")
    AI_NAV_LLM_CANDIDATE_LIMIT: int = Field(default=8, description="Max menu candidates sent to LLM per request")
    GEMINI_API_KEY: str = Field(default="", description="Google Gemini API key (optional fallback)")
    GEMINI_MODEL: str = Field(default="gemini-2.5-flash", description="Gemini model (optional fallback)")
    NVIDIA_API_KEY: str = Field(default="", description="NVIDIA NVAPI key for AI assistant navigation")
    NVIDIA_BASE_URL: str = Field(
        default="https://integrate.api.nvidia.com/v1",
        description="NVIDIA API base URL (OpenAI-compatible)",
    )
    NVIDIA_MODEL: str = Field(
        default="meta/llama-3.1-8b-instruct",
        description="NVIDIA NIM model for AI assistant navigation",
    )
    # JWT Authentication
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Azure Blob Storage (attachments)
    AZURE_STORAGE_CONNECTION_STRING: str = Field(
        default="",
        description="Azure Storage connection string for attachment blobs",
    )
    AZURE_CONTAINER_NAME: str = Field(
        default="attachmentserp",
        description="Azure Blob container name for attachments",
    )
    AZURE_BLOB_SAS_EXPIRY_MINUTES: int = Field(
        default=60,
        description="SAS token lifetime in minutes for secure attachment downloads",
    )

    # Firebase Cloud Messaging (optional; push is a no-op when unset)
    FIREBASE_CREDENTIALS_PATH: str = Field(
        default="",
        description="Path to Firebase service-account JSON for FCM admin SDK",
    )
    FIREBASE_CREDENTIALS_JSON: str = Field(
        default="",
        description="Inline Firebase service-account JSON (alternative to path)",
    )

    # In-process holiday/exam schedule processor (no Celery/Redis)
    NOTIFICATION_SCHEDULER_ENABLED: bool = Field(
        default=True,
        description="When True, run holiday/exam schedule processing on a background loop",
    )
    NOTIFICATION_SCHEDULER_INTERVAL_SECONDS: int = Field(
        default=900,
        description="Seconds between holiday/exam scheduled notification runs (default 15 min)",
    )
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    ENABLE_FILE_LOGGING: bool = False
    
    @field_validator("ENVIRONMENT")
    @classmethod
    def validate_environment(cls, v: str) -> str:
        """Validate environment value."""
        allowed = ["development", "test", "staging", "production"]
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
