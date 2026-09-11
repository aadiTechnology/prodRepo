@echo off
setlocal EnableExtensions

REM ============================================================
REM GITHUB -> CONTABO DOCKER REACT DEPLOYMENT
REM EXISTING CADDY REVERSE PROXY + DOMAIN + HTTPS
REM ============================================================
REM
REM This version is designed for the current Contabo server:
REM   factory-test-proxy-1 = Caddy
REM   Caddy public ports   = 80/443
REM   React container      = localhost:REACT_HOST_PORT
REM
REM Required config\contabo.env:
REM   CONTABO_IP
REM   CONTABO_USER
REM   CONTABO_SSH_PASSWORD
REM   CONTABO_SSH_HOSTKEY
REM   GITHUB_REPO
REM   GITHUB_BRANCH
REM   REACT_APP_DIR
REM   REACT_CONTAINER_NAME
REM   REACT_IMAGE_NAME
REM   REACT_HOST_PORT
REM   REACT_CONTAINER_PORT
REM   REACT_DOMAIN
REM   VITE_API_BASE_URL
REM
REM Optional:
REM   ENABLE_SSL=true
REM
REM Caddy automatically manages HTTPS certificates when the domain
REM resolves to this server and ports 80/443 are reachable.
REM No Certbot/host NGINX is required.
REM
REM Do not trust host-side Caddyfile edits alone. The live file
REM inside factory-test-proxy-1 must contain REACT_DOMAIN, because
REM a replaced bind-mount inode leaves Caddy on a deleted copy.
REM ============================================================

echo.
echo ============================================================
echo     REACT -> CONTABO DOCKER DEPLOYMENT
echo     EXISTING CADDY + DOMAIN + HTTPS
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
REM VALIDATE CONFIGURATION
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
    echo Add the SSH SHA256 host fingerprint to contabo.env.
    exit /b 1
)

set "PLINK_CMD=plink -batch -ssh -hostkey %CONTABO_SSH_HOSTKEY% -pw %CONTABO_SSH_PASSWORD%"

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

if "%REACT_DOMAIN%"=="" (
    echo ERROR: REACT_DOMAIN is not configured.
    echo Example: REACT_DOMAIN=erp.aaditechnology.com
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
echo Internal port : %REACT_CONTAINER_PORT%
echo Local port    : 127.0.0.1:%REACT_HOST_PORT%
echo Domain        : %REACT_DOMAIN%
echo API URL       : %VITE_API_BASE_URL%
echo.

REM ============================================================
REM STEP 1 - UPDATE SOURCE
REM ============================================================

echo ============================================================
echo [1/8] UPDATING SOURCE CODE ON CONTABO
echo ============================================================
echo.

%PLINK_CMD% %CONTABO_USER%@%CONTABO_IP% "if [ -d '%REACT_APP_DIR%/.git' ]; then cd '%REACT_APP_DIR%' && git fetch origin && git checkout '%GITHUB_BRANCH%' && git reset --hard 'origin/%GITHUB_BRANCH%'; else mkdir -p '%REACT_APP_DIR%' && git clone -b '%GITHUB_BRANCH%' '%GITHUB_REPO%' '%REACT_APP_DIR%'; fi"

if errorlevel 1 (
    echo ERROR: Git update/clone FAILED.
    exit /b 1
)

echo SUCCESS: Source code updated.
echo.

REM ============================================================
REM STEP 2 - BUILD IMAGE
REM ============================================================

echo ============================================================
echo [2/8] BUILDING DOCKER IMAGE
echo ============================================================
echo.

%PLINK_CMD% %CONTABO_USER%@%CONTABO_IP% "cd '%REACT_APP_DIR%/apps/web' && docker build --build-arg VITE_API_BASE_URL='%VITE_API_BASE_URL%' --build-arg VITE_APP_NAME='%VITE_APP_NAME%' --build-arg VITE_APP_VERSION='%VITE_APP_VERSION%' --build-arg VITE_LOGIN_DEFAULT_HOSTS='%VITE_LOGIN_DEFAULT_HOSTS%' -t '%REACT_IMAGE_NAME%:latest' ."

if errorlevel 1 (
    echo ERROR: Docker image build FAILED.
    exit /b 1
)

echo SUCCESS: Docker image built.
echo.

REM ============================================================
REM STEP 3 - REMOVE OLD CONTAINER
REM ============================================================

echo ============================================================
echo [3/8] REPLACING EXISTING REACT CONTAINER
echo ============================================================
echo.

%PLINK_CMD% %CONTABO_USER%@%CONTABO_IP% "docker rm -f '%REACT_CONTAINER_NAME%' 2>/dev/null || true"

if errorlevel 1 (
    echo ERROR: Could not remove existing React container.
    exit /b 1
)

echo Existing container removed if it existed.
echo.

REM ============================================================
REM STEP 4 - START REACT CONTAINER
REM ============================================================
REM The application remains bound to localhost only.
REM Caddy will reach it through the Docker network.
REM ============================================================

echo ============================================================
echo [4/8] STARTING REACT CONTAINER
echo ============================================================
echo.

%PLINK_CMD% %CONTABO_USER%@%CONTABO_IP% "docker run -d --name '%REACT_CONTAINER_NAME%' -p 127.0.0.1:%REACT_HOST_PORT%:%REACT_CONTAINER_PORT% --restart unless-stopped '%REACT_IMAGE_NAME%:latest'"

if errorlevel 1 (
    echo ERROR: React container START FAILED.
    exit /b 1
)

echo SUCCESS: React container started.
echo.

REM ============================================================
REM STEP 5 - CONNECT REACT CONTAINER TO CADDY NETWORK
REM ============================================================

echo ============================================================
echo [5/8] CONNECTING REACT CONTAINER TO CADDY
echo ============================================================
echo.

%PLINK_CMD% %CONTABO_USER%@%CONTABO_IP% "PROXY_NET=$(docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}' factory-test-proxy-1); if [ -z \"$PROXY_NET\" ]; then echo 'ERROR: Could not determine Caddy Docker network'; exit 1; fi; echo Caddy network: $PROXY_NET; docker network connect \"$PROXY_NET\" '%REACT_CONTAINER_NAME%' 2>/dev/null || true"

if errorlevel 1 (
    echo ERROR: Could not connect React container to Caddy network.
    exit /b 1
)

echo SUCCESS: React container connected to Caddy network.
echo.

REM ============================================================
REM STEP 6 - ADD DOMAIN TO EXISTING CADDYFILE
REM ============================================================
REM The existing Caddyfile is:
REM   {
REM     email {$ACME_EMAIL}
REM   }
REM
REM   {$DOMAIN} {
REM     encode gzip
REM     reverse_proxy web:80
REM   }
REM
REM We preserve it and add one new site block for this React app.
REM The block is added only if the domain is not already present.
REM
REM CRITICAL: Caddy bind-mounts this file read-only. If the host
REM file was replaced (new inode), the running container keeps the
REM deleted copy. Host-side edits then succeed while live Caddy
REM never sees the new site. Compare host vs container and remount
REM by restarting factory-test-proxy-1 when they differ.
REM ============================================================

echo ============================================================
echo [6/8] CONFIGURING EXISTING CADDY FOR DOMAIN
echo ============================================================
echo.

%PLINK_CMD% %CONTABO_USER%@%CONTABO_IP% "CADDYFILE=/opt/factory-test/infrastructure/docker/Caddyfile; PROXY=factory-test-proxy-1; if [ ! -f \"$CADDYFILE\" ]; then echo ERROR: Caddyfile not found at $CADDYFILE; exit 1; fi; if grep -qE '^[[:space:]]*%REACT_DOMAIN%[[:space:]]*\{' \"$CADDYFILE\"; then echo 'Domain already exists in host Caddyfile.'; else printf '\n\n%REACT_DOMAIN% {\n    encode gzip\n    reverse_proxy %REACT_CONTAINER_NAME%:%REACT_CONTAINER_PORT%\n}\n' >> \"$CADDYFILE\"; echo 'Added %REACT_DOMAIN% to host Caddyfile.'; fi; echo '--- host Caddyfile ---'; cat \"$CADDYFILE\"; HOST_MD5=$(md5sum \"$CADDYFILE\" | awk '{print $1}'); CTR_MD5=$(docker exec $PROXY md5sum /etc/caddy/Caddyfile | awk '{print $1}'); echo host_md5=$HOST_MD5; echo container_md5=$CTR_MD5; if [ \"$HOST_MD5\" != \"$CTR_MD5\" ]; then echo 'Caddyfile bind mount is stale; restarting proxy to remount.'; docker restart $PROXY; sleep 4; CTR_MD5=$(docker exec $PROXY md5sum /etc/caddy/Caddyfile | awk '{print $1}'); if [ \"$HOST_MD5\" != \"$CTR_MD5\" ]; then echo ERROR: Caddy container still cannot see the updated Caddyfile.; echo '--- live Caddyfile ---'; docker exec $PROXY cat /etc/caddy/Caddyfile; exit 1; fi; echo 'Bind remounted; live Caddyfile matches host.'; else echo 'Live Caddyfile already matches host.'; fi; echo '--- live Caddyfile ---'; docker exec $PROXY cat /etc/caddy/Caddyfile; docker exec $PROXY grep -qE '^[[:space:]]*%REACT_DOMAIN%[[:space:]]*\{' /etc/caddy/Caddyfile || { echo ERROR: Domain missing from live Caddyfile inside container.; exit 1; }; docker exec $PROXY caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile"

if errorlevel 1 (
    echo ERROR: Caddy configuration validation FAILED.
    echo Existing Caddy configuration was NOT reloaded.
    exit /b 1
)

echo SUCCESS: Live Caddyfile contains %REACT_DOMAIN%.
echo.

REM ============================================================
REM STEP 7 - APPLY CADDY CONFIG
REM ============================================================
REM Reload when the bind mount is already current.
REM Restart already loaded the remounted file when it was stale.
REM ============================================================

echo ============================================================
echo [7/8] APPLYING CADDY CONFIG
echo ============================================================
echo.

%PLINK_CMD% %CONTABO_USER%@%CONTABO_IP% "CADDYFILE=/opt/factory-test/infrastructure/docker/Caddyfile; PROXY=factory-test-proxy-1; HOST_MD5=$(md5sum \"$CADDYFILE\" | awk '{print $1}'); CTR_MD5=$(docker exec $PROXY md5sum /etc/caddy/Caddyfile | awk '{print $1}'); if [ \"$HOST_MD5\" != \"$CTR_MD5\" ]; then echo 'Caddyfile bind mount is stale; restarting proxy to remount.'; docker restart $PROXY; sleep 4; CTR_MD5=$(docker exec $PROXY md5sum /etc/caddy/Caddyfile | awk '{print $1}'); if [ \"$HOST_MD5\" != \"$CTR_MD5\" ]; then echo ERROR: Caddy container still cannot see the updated Caddyfile.; exit 1; fi; else echo 'Reloading Caddy from live Caddyfile.'; docker exec $PROXY caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile || exit 1; fi; docker exec $PROXY grep -qE '^[[:space:]]*%REACT_DOMAIN%[[:space:]]*\{' /etc/caddy/Caddyfile || { echo ERROR: Domain missing from live Caddyfile after apply.; exit 1; }; echo SUCCESS: Caddy is serving with %REACT_DOMAIN% in the live config."

if errorlevel 1 (
    echo ERROR: Caddy apply FAILED.
    echo.
    echo Check:
    echo   docker logs factory-test-proxy-1
    exit /b 1
)

echo SUCCESS: Caddy config applied.
echo.

REM ============================================================
REM STEP 8 - VERIFY
REM ============================================================

echo ============================================================
echo [8/8] VERIFYING DEPLOYMENT
echo ============================================================
echo.

echo Docker container:
%PLINK_CMD% %CONTABO_USER%@%CONTABO_IP% "docker ps --filter 'name=%REACT_CONTAINER_NAME%' --filter 'status=running' --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"

if errorlevel 1 (
    echo ERROR: Docker verification FAILED.
    exit /b 1
)

echo.
echo Local React health:
%PLINK_CMD% %CONTABO_USER%@%CONTABO_IP% "curl -fsS 'http://127.0.0.1:%REACT_HOST_PORT%/health'"

if errorlevel 1 (
    echo ERROR: React application health check FAILED.
    echo Check container logs:
    echo   plink -ssh %CONTABO_USER%@%CONTABO_IP% "docker logs %REACT_CONTAINER_NAME%"
    exit /b 1
)

echo.
echo Live Caddyfile must contain the domain:
%PLINK_CMD% %CONTABO_USER%@%CONTABO_IP% "docker exec factory-test-proxy-1 grep -qE '^[[:space:]]*%REACT_DOMAIN%[[:space:]]*\{' /etc/caddy/Caddyfile && docker exec factory-test-proxy-1 caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile"

if errorlevel 1 (
    echo ERROR: Live Caddyfile inside factory-test-proxy-1 does not contain %REACT_DOMAIN%.
    echo Host-side Caddyfile edits are not enough if the bind mount is stale.
    exit /b 1
)

echo.
echo HTTPS health through Caddy:
%PLINK_CMD% %CONTABO_USER%@%CONTABO_IP% "ok=0; i=1; while [ $i -le 20 ]; do if curl -fsS -m 20 'https://%REACT_DOMAIN%/health' | grep -qx 'OK'; then echo SUCCESS: HTTPS https://%REACT_DOMAIN%/health -^> OK; ok=1; break; fi; echo waiting_for_tls_$i; sleep 3; i=$((i+1)); done; if [ $ok -ne 1 ]; then echo ERROR: HTTPS health check failed for %REACT_DOMAIN%.; echo '--- recent Caddy logs ---'; docker logs --tail 80 factory-test-proxy-1; exit 1; fi; curl -fsSI -m 20 'https://%REACT_DOMAIN%' | head -20"

if errorlevel 1 (
    echo ERROR: HTTPS verification FAILED.
    echo Caddy owns ports 80/443 and must obtain a Let's Encrypt certificate
    echo for %REACT_DOMAIN%. Check DNS and docker logs factory-test-proxy-1.
    exit /b 1
)

echo.
echo ============================================================
echo       REACT DEPLOYMENT COMPLETED
echo ============================================================
echo.
echo Application:
echo   https://%REACT_DOMAIN%
echo.
echo React container:
echo   127.0.0.1:%REACT_HOST_PORT% -^> %REACT_CONTAINER_PORT%
echo.
echo Caddy:
echo   factory-test-proxy-1
echo.
echo API:
echo   %VITE_API_BASE_URL%
echo.
echo NOTE:
echo   Caddy manages HTTPS automatically. This script verifies
echo   the LIVE Caddyfile inside factory-test-proxy-1 and
echo   https://%REACT_DOMAIN%/health before reporting success.
echo   If the Caddyfile bind mount is stale, the proxy is
echo   restarted so Caddy remounts the current host file.
echo.
echo ============================================================
echo.

exit /b 0
