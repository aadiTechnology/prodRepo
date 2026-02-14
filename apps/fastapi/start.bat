@echo off
cd C:\Users\lenovo\AadiTech\Product\code\apps\fastapi

REM python -m venv venv

echo Activating virtual environment...
call venv\\Scripts\\activate

REM pip install -r requirements.txt

REM python.exe -m pip install --upgrade pip

REM pip install pydantic[email]
REM pip uninstall bcrypt passlib -y
REM pip install "passlib==1.7.4" "bcrypt==4.0.1"

REM sadsa
echo Starting FastAPI server...
uvicorn app.main:app --host 127.0.0.1 --port 8000

echo.
echo Press any key to close...
pause > nul