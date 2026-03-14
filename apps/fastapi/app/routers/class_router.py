from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.academic import ClassModel

router = APIRouter(prefix="/api/classes", tags=["Classes"])

@router.get("")
def list_classes(db: Session = Depends(get_db)):
    classes = db.query(ClassModel).all()
    return [{"id": c.id, "name": c.name} for c in classes]
