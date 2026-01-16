from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings
from urllib.parse import quote_plus

# DATABASE_URL = (
#     f"mssql+pyodbc://{settings.DB_USER}:{quote_plus(settings.DB_PASSWORD)}"
#     f"@{quote_plus(settings.DB_SERVER)}/{settings.DB_NAME}"
#     "?driver=ODBC+Driver+17+for+SQL+Server"
# )
DATABASE_URL = "mssql+pyodbc://LAPTOP-FC61VAQA\\SQLEXPRESS/erpdb?driver=ODBC+Driver+18+for+SQL+Server&Trusted_Connection=yes&TrustServerCertificate=yes"
engine = create_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
