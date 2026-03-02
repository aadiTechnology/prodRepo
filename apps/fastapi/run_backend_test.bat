@echo off
cd /d "%~dp0"
git pull
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
uvicorn app.main:app --host 127.0.0.1 --port 8022
pause
