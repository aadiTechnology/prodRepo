# Deployment Deliverable – Repository Structure and File Contents

## 1. Repository structure (relevant paths after changes)

```
code/
├── apps/
│   ├── fastapi/
│   │   ├── .env.dev
│   │   ├── .env.test
│   │   ├── run_backend_local.bat
│   │   ├── reset_backend_local.bat
│   │   ├── run_backend_test.bat
│   │   ├── reset_backend_test.bat
│   │   ├── alembic/
│   │   │   └── env.py          (modified)
│   │   └── app/
│   │       └── core/
│   │           └── config.py   (modified)
│   └── web/
│       ├── .env.development
│       ├── .env.test
│       ├── run_frontend_local.bat
│       ├── reset_frontend_local.bat
│       ├── run_frontend_test.bat
│       ├── reset_frontend_test.bat
│       └── package.json        (modified)
```

---

## 2. New files – full content

### apps/fastapi/.env.dev

```
ENVIRONMENT=development
DB_SERVER=localhost\SQLEXPRESS
DB_NAME=erpdb
DB_DRIVER=ODBC Driver 18 for SQL Server
DB_ECHO=false
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173
```

### apps/fastapi/.env.test

```
ENVIRONMENT=test
DB_SERVER=4.240.106.247
DB_NAME=erpdb
DB_USER=aaditechadmin
DB_PASSWORD=AadiTech@123
DB_DRIVER=ODBC Driver 18 for SQL Server
DB_ECHO=false
CORS_ORIGINS=http://erpui.aaditechnology.com
```

### apps/web/.env.development

```
VITE_API_BASE_URL=http://localhost:8000
```

### apps/web/.env.test

```
VITE_API_BASE_URL=http://erpapi.aaditechnology.com
```

### apps/fastapi/run_backend_local.bat

```bat
@echo off
cd /d "%~dp0"
set ENV_FILE=.env.dev
if exist "venv\Scripts\activate.bat" (
  echo Activating virtual environment...
  call venv\Scripts\activate
) else (
  echo Creating virtual environment...
  python -m venv venv
  call venv\Scripts\activate
  pip install -r requirements.txt
)
echo Starting FastAPI server (local)...
uvicorn app.main:app --host 127.0.0.1 --port 8000
pause
```

### apps/fastapi/reset_backend_local.bat

```bat
@echo off
cd /d "%~dp0"
set ENV_FILE=.env.dev
if exist venv (
  echo Removing existing virtual environment...
  rmdir /s /q venv
)
echo Creating virtual environment...
python -m venv venv
call venv\Scripts\activate
pip install -r requirements.txt
echo Starting FastAPI server (local)...
uvicorn app.main:app --host 127.0.0.1 --port 8000
pause
```

### apps/fastapi/run_backend_test.bat

```bat
@echo off
cd /d "%~dp0"
set ENV_FILE=.env.test
if exist "venv\Scripts\activate.bat" (
  echo Activating virtual environment...
  call venv\Scripts\activate
) else (
  echo Creating virtual environment...
  python -m venv venv
  call venv\Scripts\activate
  pip install -r requirements.txt
)
echo Starting FastAPI server (test)...
uvicorn app.main:app --host 127.0.0.1 --port 8000
pause
```

### apps/fastapi/reset_backend_test.bat

```bat
@echo off
cd /d "%~dp0"
set ENV_FILE=.env.test
if exist venv (
  echo Removing existing virtual environment...
  rmdir /s /q venv
)
echo Creating virtual environment...
python -m venv venv
call venv\Scripts\activate
pip install -r requirements.txt
echo Starting FastAPI server (test)...
uvicorn app.main:app --host 127.0.0.1 --port 8000
pause
```

### apps/web/run_frontend_local.bat

```bat
@echo off
cd /d "%~dp0"
if exist "node_modules" (
  echo Starting frontend (local)...
  npm run dev
) else (
  echo Installing dependencies...
  npm install
  echo Starting frontend (local)...
  npm run dev
)
pause
```

### apps/web/reset_frontend_local.bat

```bat
@echo off
cd /d "%~dp0"
if exist node_modules (
  echo Removing node_modules...
  rmdir /s /q node_modules
)
echo Installing dependencies...
npm install
echo Starting frontend (local)...
npm run dev
pause
```

### apps/web/run_frontend_test.bat

```bat
@echo off
cd /d "%~dp0"
if exist "node_modules" (
  echo Starting frontend (test)...
  npm run dev:test
) else (
  echo Installing dependencies...
  npm install
  echo Starting frontend (test)...
  npm run dev:test
)
pause
```

### apps/web/reset_frontend_test.bat

```bat
@echo off
cd /d "%~dp0"
if exist node_modules (
  echo Removing node_modules...
  rmdir /s /q node_modules
)
echo Installing dependencies...
npm install
echo Starting frontend (test)...
npm run dev:test
pause
```

---

## 3. Modified files – full content

### apps/fastapi/app/core/config.py

```python
from pydantic_settings import BaseSettings
from pydantic import field_validator, Field
from typing import List, Any
import os
from dotenv import load_dotenv

load_dotenv(os.getenv("ENV_FILE", ".env"))

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
    ENVIRONMENT: str = Field(default="development", description="Environment: development, test, staging, production")
    
    # Database
    DB_SERVER: str = ""
    DB_NAME: str = ""
    DB_USER: str = ""
    DB_PASSWORD: str = ""
    DB_DRIVER: str = "ODBC Driver 18 for SQL Server"
    DB_ECHO: bool = False
    
    # CORS - Optimized for better security and performance (comma-separated string in .env)
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173", "http://127.0.0.1:5173"]
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
        allowed = ["development", "test", "staging", "production"]
        if v.lower() not in allowed:
            raise ValueError(f"ENVIRONMENT must be one of {allowed}")
        return v.lower()

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Any) -> List[str]:
        """Parse CORS_ORIGINS from comma-separated string or list."""
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            return [x.strip() for x in v.split(",") if x.strip()]
        return []
    
    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        """Validate SECRET_KEY for production."""
        # Note: Environment check is done in validate_production_settings()
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
            if not self.DB_SERVER or not self.DB_NAME:
                errors.append("DB_SERVER and DB_NAME are required in production")
            if self.SECRET_KEY == "your-secret-key-change-in-production":
                errors.append("SECRET_KEY must be changed from default in production")
            if len(self.SECRET_KEY) < 32:
                errors.append("SECRET_KEY must be at least 32 characters in production")
            if self.DEBUG:
                errors.append("DEBUG must be False in production")
            if "*" in self.CORS_ORIGINS:
                errors.append("CORS_ORIGINS should not contain '*' in production")
        return errors
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

if settings.ENVIRONMENT == "production":
    validation_errors = settings.validate_production_settings()
    if validation_errors:
        import sys
        print("ERROR: Production settings validation failed:", file=sys.stderr)
        for error in validation_errors:
            print(f"  - {error}", file=sys.stderr)
        sys.exit(1)
```

### apps/fastapi/alembic/env.py

```python
import os
from dotenv import load_dotenv

load_dotenv(os.getenv("ENV_FILE", ".env"))

from app.core.database import Base, get_database_url
from app.models import user
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

config = context.config

db_url = get_database_url().replace("%", "%%")
config.set_main_option("sqlalchemy.url", db_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

### apps/web/package.json

```json
{
  "name": "react-mui-typescript-router",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "dev:test": "vite --mode test",
    "build": "vite build",
    "build:test": "vite build --mode test",
    "preview": "vite preview"
  },
  "dependencies": {
    "@emotion/react": "^11.11.4",
    "@emotion/styled": "^11.11.5",
    "@mui/icons-material": "^6.0.0",
    "@mui/material": "^6.0.0",
    "axios": "^1.7.9",
    "notistack": "^3.0.2",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.23.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "typescript": "^5.5.3",
    "vite": "^5.3.1"
  }
}
```
