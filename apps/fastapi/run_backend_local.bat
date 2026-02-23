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
