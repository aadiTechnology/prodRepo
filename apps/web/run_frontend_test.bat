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
