from fastapi import FastAPI
from app.core.database import Base, engine
from app.routers import user

Base.metadata.create_all(bind=engine)

app = FastAPI(title="FastAPI SQL Server CRUD")

app.include_router(user.router)
