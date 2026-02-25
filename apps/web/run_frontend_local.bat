@echo off
cd /d "%~dp0"
if exist "node_modules" (
  echo Starting frontend local...
  npm run dev
) else (
  echo Installing dependencies...
  npm install
  echo Starting frontend local...
  npm run dev
)
pause
