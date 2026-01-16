# FastAPI + SQL Server CRUD

## Installation

1. Create virtual environment
```
python -m venv venv
venv\Scripts\activate
```

2. Install dependencies
```
pip install -r requirements.txt
```

3. Configure environment
- Copy `.env.example` to `.env`
- Update SQL Server credentials

4. Ensure SQL Server ODBC Driver 17/18 is installed

## Run Application
```
uvicorn app.main:app --reload
```

Open:
http://127.0.0.1:8000/docs
