@echo off
setlocal EnableExtensions

REM ============================================================
REM GITHUB -> CONTABO DOCKER REACT DEPLOYMENT
REM REUSABLE FOR MULTIPLE REACT/VITE APPS
REM EXISTING CADDY REVERSE PROXY + DOMAIN + HTTPS
REM ============================================================
REM
REM Per-app values come from config\contabo.env.
REM To deploy another compatible React/Vite app, change only
REM the per-app settings in contabo.env. Do not clone this BAT.
REM
REM This version is designed for the current Contabo server:
REM   CADDY_CONTAINER_NAME = existing Caddy proxy
REM   Caddy public ports   = 80/443
REM   React container      = 127.0.0.1:REACT_HOST_PORT
REM
REM Required common settings in config\contabo.env:
REM   CONTABO_IP
REM   CONTABO_USER
REM   CONTABO_SSH_PASSWORD
REM   CONTABO_SSH_HOSTKEY
REM
REM Required per-app settings:
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
REM Optional per-app:
REM   REACT_FRONTEND_DIR   (default apps/web)
REM   VITE_APP_NAME
REM   VITE_APP_VERSION
REM   VITE_LOGIN_DEFAULT_HOSTS
REM
REM Optional common:
REM   CADDY_CONTAINER_NAME (default factory-test-proxy-1)
REM   CADDYFILE_PATH       (default /opt/factory-test/infrastructure/docker/Caddyfile)
REM   CADDY_EXISTING_DOMAIN (default aifactorytest.aaditechnology.com)
REM
REM Caddy automatically manages HTTPS certificates when the domain
REM resolves to this server and ports 80/443 are reachable.
REM No Certbot/host NGINX is required.
REM
REM Do not trust host-side Caddyfile edits alone. The live file
REM inside the Caddy container must contain REACT_DOMAIN, because
REM a replaced bind-mount inode leaves Caddy on a deleted copy.
REM ============================================================

echo.
echo ============================================================
echo     REACT -^> CONTABO DOCKER DEPLOYMENT
echo     EXISTING CADDY + DOMAIN + HTTPS
echo ============================================================
echo.

REM ============================================================
REM STEP 0 - LOAD CONFIGURATION
REM ============================================================

set "CONFIG_FILE=%~dp0config\contabo.env"

if not exist "%CONFIG_FILE%" (
    echo ERROR: Config file not found:
    echo   %CONFIG_FILE%
    exit /b 1
)

for /f "usebackq eol=# tokens=1,* delims==" %%A in ("%CONFIG_FILE%") do (
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

if "%REACT_FRONTEND_DIR%"=="" set "REACT_FRONTEND_DIR=apps/web"
set "REACT_FRONTEND_DIR=%REACT_FRONTEND_DIR:\=/%"

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
    echo Each app must use a unique localhost host port. Do not reuse another app's port.
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

if "%CADDY_CONTAINER_NAME%"=="" set "CADDY_CONTAINER_NAME=factory-test-proxy-1"
if "%CADDYFILE_PATH%"=="" set "CADDYFILE_PATH=/opt/factory-test/infrastructure/docker/Caddyfile"
if "%CADDY_EXISTING_DOMAIN%"=="" set "CADDY_EXISTING_DOMAIN=aifactorytest.aaditechnology.com"

REM ------------------------------------------------------------
REM Refuse to target Caddy / factory-test containers or trees.
REM ------------------------------------------------------------

if /I "%REACT_CONTAINER_NAME%"=="%CADDY_CONTAINER_NAME%" (
    echo ERROR: REACT_CONTAINER_NAME cannot be the Caddy container %CADDY_CONTAINER_NAME%.
    exit /b 1
)

echo %REACT_CONTAINER_NAME%| findstr /I /R /C:"^factory-test-" >nul
if not errorlevel 1 (
    echo ERROR: REACT_CONTAINER_NAME cannot target factory-test containers.
    echo Refusing: %REACT_CONTAINER_NAME%
    exit /b 1
)

echo %REACT_APP_DIR%| findstr /I /C:"/opt/factory-test" >nul
if not errorlevel 1 (
    echo ERROR: REACT_APP_DIR cannot point at the factory-test application tree.
    echo Refusing: %REACT_APP_DIR%
    exit /b 1
)

echo Target server : %CONTABO_IP%
echo Repository    : %GITHUB_REPO%
echo Branch        : %GITHUB_BRANCH%
echo App directory : %REACT_APP_DIR%
echo Frontend dir  : %REACT_FRONTEND_DIR%
echo Container     : %REACT_CONTAINER_NAME%
echo Image         : %REACT_IMAGE_NAME%:latest
echo Internal port : %REACT_CONTAINER_PORT%
echo Local port    : 127.0.0.1:%REACT_HOST_PORT%
echo Domain        : %REACT_DOMAIN%
echo API URL       : %VITE_API_BASE_URL%
echo Caddy         : %CADDY_CONTAINER_NAME%
echo Caddyfile     : %CADDYFILE_PATH%
echo Protect site  : %CADDY_EXISTING_DOMAIN%
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

%PLINK_CMD% %CONTABO_USER%@%CONTABO_IP% "conflict=$(docker ps --format '{{.Names}} {{.Image}}' | awk -v img='%REACT_IMAGE_NAME%:latest' -v me='%REACT_CONTAINER_NAME%' '$2 == img && $1 != me {print $1}'); if [ -n \"$conflict\" ]; then echo ERROR: Image %REACT_IMAGE_NAME%:latest is already used by running container $conflict; exit 1; fi; if [ ! -f '%REACT_APP_DIR%/%REACT_FRONTEND_DIR%/Dockerfile' ]; then echo ERROR: Dockerfile not found at %REACT_APP_DIR%/%REACT_FRONTEND_DIR%/Dockerfile; exit 1; fi; cd '%REACT_APP_DIR%/%REACT_FRONTEND_DIR%' && docker build --build-arg VITE_API_BASE_URL='%VITE_API_BASE_URL%' --build-arg VITE_APP_NAME='%VITE_APP_NAME%' --build-arg VITE_APP_VERSION='%VITE_APP_VERSION%' --build-arg VITE_LOGIN_DEFAULT_HOSTS='%VITE_LOGIN_DEFAULT_HOSTS%' -t '%REACT_IMAGE_NAME%:latest' ."

if errorlevel 1 (
    echo ERROR: Docker image build FAILED.
    exit /b 1
)

echo SUCCESS: Docker image built.
echo.

REM ============================================================
REM STEP 3 - REMOVE OLD CONTAINER
REM ============================================================
REM Only the configured REACT_CONTAINER_NAME is replaced.
REM Other app containers and factory-test are left untouched.
REM ============================================================

echo ============================================================
echo [3/8] REPLACING EXISTING REACT CONTAINER
echo ============================================================
echo.

%PLINK_CMD% %CONTABO_USER%@%CONTABO_IP% "case '%REACT_CONTAINER_NAME%' in factory-test-*|'%CADDY_CONTAINER_NAME%') echo ERROR: Refusing to remove protected container %REACT_CONTAINER_NAME%; exit 1;; esac; owner=$(docker ps --format '{{.Names}} {{.Ports}}' | awk -v want='127.0.0.1:%REACT_HOST_PORT%->' 'index($0, want) {print $1; exit}'); if [ -n \"$owner\" ] && [ \"$owner\" != '%REACT_CONTAINER_NAME%' ]; then echo ERROR: Host port %REACT_HOST_PORT% is already used by container $owner; echo Choose a unique REACT_HOST_PORT for this app.; exit 1; fi; docker rm -f '%REACT_CONTAINER_NAME%' 2>/dev/null || true"

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

%PLINK_CMD% %CONTABO_USER%@%CONTABO_IP% "PROXY_NET=$(docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}' '%CADDY_CONTAINER_NAME%'); if [ -z \"$PROXY_NET\" ]; then echo 'ERROR: Could not determine Caddy Docker network'; exit 1; fi; echo Caddy network: $PROXY_NET; docker network connect \"$PROXY_NET\" '%REACT_CONTAINER_NAME%' 2>/dev/null || true; NETS=$(docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' '%REACT_CONTAINER_NAME%'); echo React networks: $NETS; echo \"$NETS\" | grep -qw \"$PROXY_NET\" || { echo ERROR: %REACT_CONTAINER_NAME% is not connected to $PROXY_NET; exit 1; }; docker exec '%CADDY_CONTAINER_NAME%' getent hosts '%REACT_CONTAINER_NAME%' || { echo ERROR: Caddy cannot resolve %REACT_CONTAINER_NAME%; exit 1; }; HEALTH=$(docker exec '%CADDY_CONTAINER_NAME%' wget -qO- -T 15 http://%REACT_CONTAINER_NAME%:%REACT_CONTAINER_PORT%/health); echo caddy_to_app_health=$HEALTH; echo \"$HEALTH\" | grep -qx 'OK' || { echo ERROR: Caddy cannot reach %REACT_CONTAINER_NAME%:%REACT_CONTAINER_PORT%/health; exit 1; }"

if errorlevel 1 (
    echo ERROR: Could not connect React container to Caddy network.
    exit /b 1
)

echo SUCCESS: React container connected to Caddy network and reachable.
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
REM We preserve every existing site and add one new site block
REM for this React app only if the domain is not already present.
REM reverse_proxy uses REACT_CONTAINER_NAME, never a hard-coded app.
REM
REM CRITICAL: Caddy bind-mounts this file read-only. If the host
REM file was replaced (new inode), the running container keeps the
REM deleted copy. Host-side edits then succeed while live Caddy
REM never sees the new site. Compare host vs container and remount
REM by restarting CADDY_CONTAINER_NAME when they differ.
REM ============================================================

echo ============================================================
echo [6/8] CONFIGURING EXISTING CADDY FOR DOMAIN
echo ============================================================
echo.

%PLINK_CMD% %CONTABO_USER%@%CONTABO_IP% "CADDYFILE='%CADDYFILE_PATH%'; PROXY='%CADDY_CONTAINER_NAME%'; if [ ! -f \"$CADDYFILE\" ]; then echo ERROR: Caddyfile not found at $CADDYFILE; exit 1; fi; grep -Fq '{$DOMAIN}' \"$CADDYFILE\" || { echo ERROR: Protected {$DOMAIN} site block is missing from host Caddyfile.; exit 1; }; if grep -qE '^[[:space:]]*%REACT_DOMAIN%[[:space:]]*\{' \"$CADDYFILE\"; then echo 'Domain already exists in host Caddyfile.'; grep -qE 'reverse_proxy[[:space:]]+%REACT_CONTAINER_NAME%:%REACT_CONTAINER_PORT%' \"$CADDYFILE\" || { echo ERROR: %REACT_DOMAIN% exists but reverse_proxy does not target %REACT_CONTAINER_NAME%:%REACT_CONTAINER_PORT%.; echo Other Caddy sites were not changed.; exit 1; }; else printf '\n\n%REACT_DOMAIN% {\n    encode gzip\n    reverse_proxy %REACT_CONTAINER_NAME%:%REACT_CONTAINER_PORT%\n}\n' >> \"$CADDYFILE\"; echo 'Added %REACT_DOMAIN% to host Caddyfile.'; fi; echo '--- host Caddyfile ---'; cat \"$CADDYFILE\"; HOST_MD5=$(md5sum \"$CADDYFILE\" | awk '{print $1}'); CTR_MD5=$(docker exec $PROXY md5sum /etc/caddy/Caddyfile | awk '{print $1}'); echo host_md5=$HOST_MD5; echo container_md5=$CTR_MD5; if [ \"$HOST_MD5\" != \"$CTR_MD5\" ]; then echo 'Caddyfile bind mount is stale; restarting proxy to remount.'; docker restart $PROXY; sleep 4; CTR_MD5=$(docker exec $PROXY md5sum /etc/caddy/Caddyfile | awk '{print $1}'); if [ \"$HOST_MD5\" != \"$CTR_MD5\" ]; then echo ERROR: Caddy container still cannot see the updated Caddyfile.; echo '--- live Caddyfile ---'; docker exec $PROXY cat /etc/caddy/Caddyfile; exit 1; fi; echo 'Bind remounted; live Caddyfile matches host.'; else echo 'Live Caddyfile already matches host.'; fi; echo '--- live Caddyfile ---'; docker exec $PROXY cat /etc/caddy/Caddyfile; docker exec $PROXY grep -qE '^[[:space:]]*%REACT_DOMAIN%[[:space:]]*\{' /etc/caddy/Caddyfile || { echo ERROR: Domain missing from live Caddyfile inside container.; exit 1; }; docker exec $PROXY grep -Fq '{$DOMAIN}' /etc/caddy/Caddyfile || { echo ERROR: Protected {$DOMAIN} site missing from live Caddyfile.; exit 1; }; docker exec $PROXY caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile"

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

%PLINK_CMD% %CONTABO_USER%@%CONTABO_IP% "CADDYFILE='%CADDYFILE_PATH%'; PROXY='%CADDY_CONTAINER_NAME%'; HOST_MD5=$(md5sum \"$CADDYFILE\" | awk '{print $1}'); CTR_MD5=$(docker exec $PROXY md5sum /etc/caddy/Caddyfile | awk '{print $1}'); if [ \"$HOST_MD5\" != \"$CTR_MD5\" ]; then echo 'Caddyfile bind mount is stale; restarting proxy to remount.'; docker restart $PROXY; sleep 4; CTR_MD5=$(docker exec $PROXY md5sum /etc/caddy/Caddyfile | awk '{print $1}'); if [ \"$HOST_MD5\" != \"$CTR_MD5\" ]; then echo ERROR: Caddy container still cannot see the updated Caddyfile.; exit 1; fi; else echo 'Reloading Caddy from live Caddyfile.'; docker exec $PROXY caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile || exit 1; fi; docker exec $PROXY grep -qE '^[[:space:]]*%REACT_DOMAIN%[[:space:]]*\{' /etc/caddy/Caddyfile || { echo ERROR: Domain missing from live Caddyfile after apply.; exit 1; }; docker exec $PROXY grep -Fq '{$DOMAIN}' /etc/caddy/Caddyfile || { echo ERROR: Protected {$DOMAIN} site missing after apply.; exit 1; }; echo SUCCESS: Caddy is serving with %REACT_DOMAIN% in the live config."

if errorlevel 1 (
    echo ERROR: Caddy apply FAILED.
    echo.
    echo Check:
    echo   docker logs %CADDY_CONTAINER_NAME%
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
%PLINK_CMD% %CONTABO_USER%@%CONTABO_IP% "running=$(docker ps --filter 'name=%REACT_CONTAINER_NAME%' --filter 'status=running' --format '{{.Names}} {{.Status}} {{.Ports}}' | awk -v me='%REACT_CONTAINER_NAME%' '$1 == me {print}'); if [ -z \"$running\" ]; then echo ERROR: Container %REACT_CONTAINER_NAME% is not running.; docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'; exit 1; fi; echo \"$running\""

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
%PLINK_CMD% %CONTABO_USER%@%CONTABO_IP% "docker exec '%CADDY_CONTAINER_NAME%' grep -qE '^[[:space:]]*%REACT_DOMAIN%[[:space:]]*\{' /etc/caddy/Caddyfile && docker exec '%CADDY_CONTAINER_NAME%' grep -qE 'reverse_proxy[[:space:]]+%REACT_CONTAINER_NAME%:%REACT_CONTAINER_PORT%' /etc/caddy/Caddyfile && docker exec '%CADDY_CONTAINER_NAME%' caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile"

if errorlevel 1 (
    echo ERROR: Live Caddyfile inside %CADDY_CONTAINER_NAME% does not contain %REACT_DOMAIN%.
    echo Host-side Caddyfile edits are not enough if the bind mount is stale.
    exit /b 1
)

echo.
echo HTTPS health through Caddy:
%PLINK_CMD% %CONTABO_USER%@%CONTABO_IP% "ok=0; i=1; while [ $i -le 20 ]; do if curl -fsS -m 20 'https://%REACT_DOMAIN%/health' | grep -qx 'OK'; then echo SUCCESS: HTTPS https://%REACT_DOMAIN%/health -^> OK; ok=1; break; fi; echo waiting_for_tls_$i; sleep 3; i=$((i+1)); done; if [ $ok -ne 1 ]; then echo ERROR: HTTPS health check failed for %REACT_DOMAIN%.; echo '--- recent Caddy logs ---'; docker logs --tail 80 '%CADDY_CONTAINER_NAME%'; exit 1; fi; curl -fsSI -m 20 'https://%REACT_DOMAIN%' | head -20"

if errorlevel 1 (
    echo ERROR: HTTPS verification FAILED.
    echo Caddy owns ports 80/443 and must obtain a Let's Encrypt certificate
    echo for %REACT_DOMAIN%. Check DNS and docker logs %CADDY_CONTAINER_NAME%.
    exit /b 1
)

echo.
echo Existing protected site %CADDY_EXISTING_DOMAIN%:
%PLINK_CMD% %CONTABO_USER%@%CONTABO_IP% "curl -fsSI -m 20 'https://%CADDY_EXISTING_DOMAIN%/' | head -20; curl -fsSI -m 20 'https://%CADDY_EXISTING_DOMAIN%/' | grep -qiE '^HTTP/.* 200' || { echo ERROR: Existing site https://%CADDY_EXISTING_DOMAIN%/ did not return HTTP 200.; exit 1; }; echo SUCCESS: Existing site https://%CADDY_EXISTING_DOMAIN%/ still returns HTTP 200."

if errorlevel 1 (
    echo ERROR: Existing Caddy site %CADDY_EXISTING_DOMAIN% appears affected.
    echo React deploy must not break the factory-test HTTPS site.
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
echo   %CADDY_CONTAINER_NAME%
echo.
echo API:
echo   %VITE_API_BASE_URL%
echo.
echo NOTE:
echo   Caddy manages HTTPS automatically. This script verifies
echo   the LIVE Caddyfile inside %CADDY_CONTAINER_NAME% and
echo   https://%REACT_DOMAIN%/health before reporting success.
echo   If the Caddyfile bind mount is stale, the proxy is
echo   restarted so Caddy remounts the current host file.
echo   Existing site %CADDY_EXISTING_DOMAIN% is checked so
echo   other apps on this Caddy instance stay available.
echo.
echo ============================================================
echo.

exit /b 0
