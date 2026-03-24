from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.logging_config import get_logger
from app.core.exceptions import AppException, NotFoundException
from app.services import student_fee_assignment_service
from app.schemas.student_fee_assignment import (
    StudentDropdownResponse,
    StudentDetailResponse,
    StudentFeeAssignmentCreate,
    StudentFeeAssignmentResponse,
)

logger = get_logger(__name__)

router = APIRouter(prefix="/students", tags=["Student Fee Assignment"])

@router.get("/dropdown", response_model=list[StudentDropdownResponse])
def get_students_dropdown(db: Session = Depends(get_db)):
    return student_fee_assignment_service.get_students_for_dropdown(db)

@router.get("/{student_id}", response_model=StudentDetailResponse)
def get_student_detail(student_id: int, db: Session = Depends(get_db)):
    return student_fee_assignment_service.get_student_detail(db, student_id)

from fastapi import Body

@router.post("/assign-fee", response_model=StudentFeeAssignmentResponse, status_code=status.HTTP_201_CREATED)
def assign_fee(
    payload: StudentFeeAssignmentCreate = Body(...),
    db: Session = Depends(get_db),
):
    return student_fee_assignment_service.assign_fee_to_student(db, payload)
