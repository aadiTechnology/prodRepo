from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date
from typing import Optional
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.services.attendance_service import AttendanceService
from app.schemas.attendance_schema import MarkAttendanceRequest, AttendanceListResponse, AttendanceReportResponse

router = APIRouter(prefix="/attendance", tags=["Attendance"])

@router.get("", response_model=AttendanceListResponse)
def get_attendance(
    attendance_date: date,
    class_id: int,
    division_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    try:
        service = AttendanceService(db)
        return service.get_attendance_grid(attendance_date, class_id, division_id, current_user.tenant_id)
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to fetch attendance data")

@router.post("/mark")
def mark_attendance(
    req: MarkAttendanceRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    try:
        service = AttendanceService(db)
        return service.mark_attendance(req, current_user)
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to save attendance records")

@router.get("/report", response_model=AttendanceReportResponse)
def get_attendance_report(
    from_date: date,
    to_date: date,
    class_id: Optional[int] = Query(None),
    division_id: Optional[int] = Query(None),
    student_id: Optional[int] = Query(None),
    limit: int = Query(100),
    offset: int = Query(0),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    try:
        service = AttendanceService(db)
        return service.get_attendance_report(
            current_user.tenant_id,
            from_date,
            to_date,
            class_id,
            division_id,
            student_id,
            limit,
            offset
        )
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to generate attendance report")
