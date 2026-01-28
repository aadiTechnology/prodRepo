@echo off
cd C:\Users\lenovo\AadiTech\Product\code\apps\fastapi

#venv\\Scripts\\activate

echo Activating virtual environment...
call venv\\Scripts\\activate

#pip install -r requirements.txt

#python.exe -m pip install --upgrade pip

#pip install 'pydantic[email]'

echo Starting FastAPI server...
uvicorn app.main:app --host 127.0.0.1 --port 8000

echo.
echo Press any key to close...
pause > nul