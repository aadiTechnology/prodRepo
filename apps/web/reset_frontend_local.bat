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
