from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.academic import AcademicYear

router = APIRouter(prefix="/api/academic-years", tags=["Academic Years"])

@router.get("")
def list_academic_years(db: Session = Depends(get_db)):
    years = db.query(AcademicYear).all()
    print("DEBUG academic_years:", years)
    for y in years:
        print(f"DEBUG AcademicYear id={y.id} name={y.name}")
    return [{"id": y.id, "name": y.name} for y in years]
