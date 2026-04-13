

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.student_service import StudentService
from app.schemas.student_schema import StudentListResponse, StudentUpdateRequest, StudentCreateRequest, StudentCreateResponse
from app.core.dependencies import get_current_user
from typing import Optional

router = APIRouter(prefix="/students", tags=["Students"])

@router.post("", response_model=StudentCreateResponse, status_code=201)
def add_student(
    req: StudentCreateRequest,
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    try:
        result = StudentService(db).add_student(req, user)
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to create student")

@router.get("", response_model=StudentListResponse)
def get_students(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    class_id: Optional[int] = None,
    class_: Optional[str] = Query(None, alias="class"),
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    try:
        result = StudentService(db).get_students(page, limit, search, class_id, class_, status)
        return result.dict(by_alias=True)
    except Exception as e:
        print("Error in get_students:", e)
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail="Unable to load students")

@router.get("/{student_id}")
def get_student_by_id(student_id: str, db: Session = Depends(get_db)):
    student = StudentService(db).get_student_by_id(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student

@router.put("/{student_id}")
def update_student(student_id: str, req: StudentUpdateRequest, db: Session = Depends(get_db)):
    try:
        return StudentService(db).update_student(student_id, req)
    except StudentService.NotFound:
        raise HTTPException(status_code=404, detail="Student not found")
    except StudentService.AccessDenied:
        raise HTTPException(status_code=401, detail="Access denied")
    except Exception as e:
        print("Error in update_student:", e)
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail="Unable to update student")

@router.delete("/{student_id}")
def delete_student(student_id: str, db: Session = Depends(get_db)):
    try:
        return StudentService(db).soft_delete_student(student_id)
    except StudentService.NotFound:
        raise HTTPException(status_code=404, detail="Student not found")
    except StudentService.AccessDenied:
        raise HTTPException(status_code=401, detail="Access denied")
    except Exception as e:
        print("Error in delete_student:", e)
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail="Unable to delete student")
