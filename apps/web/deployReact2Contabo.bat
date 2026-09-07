@echo off
setlocal EnableExtensions

REM ============================================================
REM GITHUB -> CONTABO DOCKER REACT DEPLOYMENT
REM ============================================================
REM Repository:
REM   https://github.com/aadiTechnology/prodRepo.git
REM
REM Frontend:
REM   apps/web
REM
REM Usage:
REM   deployReact2Contabo.bat
REM ============================================================

echo.
echo ============================================================
echo        REACT -> CONTABO DOCKER DEPLOYMENT
echo ============================================================
echo.

REM ============================================================
REM STEP 0 - LOAD CONFIGURATION
REM ============================================================

set "CONFIG_FILE=%~dp0\config\contabo.env"

if not exist "%CONFIG_FILE%" (
    echo ERROR: Config file not found:
    echo   %CONFIG_FILE%
    exit /b 1
)

for /f "usebackq tokens=1,* delims==" %%A in ("%CONFIG_FILE%") do (
    if not "%%A"=="" set "%%A=%%B"
)

REM ============================================================
REM VALIDATE REQUIRED VARIABLES
REM ============================================================

if "%CONTABO_IP%"=="" (
    echo ERROR: CONTABO_IP is not configured.
    exit /b 1
)

if "%CONTABO_USER%"=="" (
    echo ERROR: CONTABO_USER is not configured.
    exit /b 1
)

if "%CONTABO_SSH_PASSWORD%"=="" (
    echo ERROR: CONTABO_SSH_PASSWORD is not configured.
    exit /b 1
)

if "%CONTABO_SSH_HOSTKEY%"=="" (
    echo ERROR: CONTABO_SSH_HOSTKEY is not configured.
    echo Run: plink -ssh %CONTABO_USER%@%CONTABO_IP% "exit"
    echo Then copy the SHA256 fingerprint into config\contabo.env
    exit /b 1
)

set PLINK_CMD=plink -batch -ssh -hostkey %CONTABO_SSH_HOSTKEY% -pw %CONTABO_SSH_PASSWORD%

if "%GITHUB_REPO%"=="" (
    echo ERROR: GITHUB_REPO is not configured.
    exit /b 1
)

if "%GITHUB_BRANCH%"=="" set "GITHUB_BRANCH=main"

if "%REACT_APP_DIR%"=="" (
    echo ERROR: REACT_APP_DIR is not configured.
    exit /b 1
)

if "%REACT_CONTAINER_NAME%"=="" (
    echo ERROR: REACT_CONTAINER_NAME is not configured.
    exit /b 1
)

if "%REACT_IMAGE_NAME%"=="" (
    echo ERROR: REACT_IMAGE_NAME is not configured.
    exit /b 1
)

if "%REACT_HOST_PORT%"=="" (
    echo ERROR: REACT_HOST_PORT is not configured.
    exit /b 1
)

if "%REACT_CONTAINER_PORT%"=="" (
    echo ERROR: REACT_CONTAINER_PORT is not configured.
    exit /b 1
)

if "%VITE_API_BASE_URL%"=="" (
    echo ERROR: VITE_API_BASE_URL is not configured.
    exit /b 1
)

if "%VITE_APP_NAME%"=="" set "VITE_APP_NAME=Preschool ERP"
if "%VITE_APP_VERSION%"=="" set "VITE_APP_VERSION=1.0.0"
if "%VITE_LOGIN_DEFAULT_HOSTS%"=="" set "VITE_LOGIN_DEFAULT_HOSTS=localhost,127.0.0.1"

echo Target server : %CONTABO_IP%
echo Repository    : %GITHUB_REPO%
echo Branch        : %GITHUB_BRANCH%
echo App directory : %REACT_APP_DIR%
echo Container     : %REACT_CONTAINER_NAME%
echo Image         : %REACT_IMAGE_NAME%:latest
echo Web port      : %REACT_HOST_PORT%
echo API URL       : %VITE_API_BASE_URL%
echo.

REM ============================================================
REM STEP 1 - PREPARE / UPDATE SOURCE CODE
REM ============================================================

echo ============================================================
echo [1/5] UPDATING SOURCE CODE ON CONTABO
echo ============================================================
echo.

%PLINK_CMD% %CONTABO_USER%@%CONTABO_IP% "if [ -d '%REACT_APP_DIR%/.git' ]; then cd '%REACT_APP_DIR%' && git fetch origin && git checkout '%GITHUB_BRANCH%' && git reset --hard 'origin/%GITHUB_BRANCH%'; else mkdir -p '%REACT_APP_DIR%' && git clone -b '%GITHUB_BRANCH%' '%GITHUB_REPO%' '%REACT_APP_DIR%'; fi"

if errorlevel 1 (
    echo.
    echo ERROR: Git update/clone FAILED.
    echo.
    exit /b 1
)

echo.
echo SUCCESS: Source code updated.
echo.

REM ============================================================
REM STEP 2 - BUILD DOCKER IMAGE
REM ============================================================

echo ============================================================
echo [2/5] BUILDING DOCKER IMAGE
echo ============================================================
echo.
echo Docker build context:
echo   %REACT_APP_DIR%/apps/web
echo.

%PLINK_CMD% %CONTABO_USER%@%CONTABO_IP% "cd '%REACT_APP_DIR%/apps/web' && docker build --build-arg VITE_API_BASE_URL='%VITE_API_BASE_URL%' --build-arg VITE_APP_NAME='%VITE_APP_NAME%' --build-arg VITE_APP_VERSION='%VITE_APP_VERSION%' --build-arg VITE_LOGIN_DEFAULT_HOSTS='%VITE_LOGIN_DEFAULT_HOSTS%' -t '%REACT_IMAGE_NAME%:latest' ."

if errorlevel 1 (
    echo.
    echo ERROR: Docker image build FAILED.
    echo.
    exit /b 1
)

echo.
echo SUCCESS: Docker image built.
echo.

REM ============================================================
REM STEP 3 - STOP / REMOVE EXISTING CONTAINER
REM ============================================================

echo ============================================================
echo [3/5] REPLACING EXISTING CONTAINER
echo ============================================================
echo.

%PLINK_CMD% %CONTABO_USER%@%CONTABO_IP% "docker rm -f '%REACT_CONTAINER_NAME%' 2>/dev/null || true"

if errorlevel 1 (
    echo.
    echo ERROR: Could not remove existing container.
    echo.
    exit /b 1
)

echo Existing container removed if it existed.
echo.

REM ============================================================
REM STEP 4 - START NEW CONTAINER
REM ============================================================

echo ============================================================
echo [4/5] STARTING NEW REACT CONTAINER
echo ============================================================
echo.

%PLINK_CMD% %CONTABO_USER%@%CONTABO_IP% "docker run -d --name '%REACT_CONTAINER_NAME%' -p %REACT_HOST_PORT%:%REACT_CONTAINER_PORT% --restart unless-stopped '%REACT_IMAGE_NAME%:latest'"

if errorlevel 1 (
    echo.
    echo ERROR: Docker container START FAILED.
    echo.
    exit /b 1
)

echo.
echo SUCCESS: Container started.
echo.

REM ============================================================
REM STEP 5 - VERIFY
REM ============================================================

echo ============================================================
echo [5/5] VERIFYING DEPLOYMENT
echo ============================================================
echo.

%PLINK_CMD% %CONTABO_USER%@%CONTABO_IP% "docker ps --filter 'name=%REACT_CONTAINER_NAME%' --filter 'status=running' --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"

if errorlevel 1 (
    echo.
    echo ERROR: Docker verification FAILED.
    echo.
    exit /b 1
)

echo.
echo Checking application health...
echo.

%PLINK_CMD% %CONTABO_USER%@%CONTABO_IP% "curl -fsS 'http://127.0.0.1:%REACT_HOST_PORT%/health'"

if errorlevel 1 (
    echo.
    echo ERROR: Application health check FAILED.
    echo.
    echo Check container logs with:
    echo   plink -ssh %CONTABO_USER%@%CONTABO_IP% "docker logs %REACT_CONTAINER_NAME%"
    echo.
    exit /b 1
)

echo.
echo.
echo ============================================================
echo       REACT DEPLOYMENT COMPLETED SUCCESSFULLY
echo ============================================================
echo.
echo Application:
echo   http://%CONTABO_IP%:%REACT_HOST_PORT%
echo.
echo Health:
echo   http://%CONTABO_IP%:%REACT_HOST_PORT%/health
echo.
echo API:
echo   %VITE_API_BASE_URL%
echo.
echo ============================================================
echo.

exit /b 0
