from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date
from typing import Optional
from sqlalchemy import or_
from app.core.database import get_db
from app.core.dependencies import get_current_user, get_rbac_role_codes, SYSTEM_ADMIN_ROLE_CODE
from app.services.attendance_service import AttendanceService
from app.schemas.attendance_schema import (
    MarkAttendanceRequest,
    AttendanceListResponse,
    AttendanceReportResponse,
    AttendanceReportSummary,
)
from app.models.teacher import Teacher
from app.models.user import UserRole

router = APIRouter(prefix="/attendance", tags=["Attendance"])


def _is_admin_like(current_user, db: Session) -> bool:
    if current_user.role in [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN]:
        return True
    role_codes = get_rbac_role_codes(db, current_user.id)
    return any(
        code in role_codes
        for code in ["admin", "tenant_admin", SYSTEM_ADMIN_ROLE_CODE.lower()]
    )

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
        if not _is_admin_like(current_user, db):
            teacher = (
                db.query(Teacher)
                .filter(
                    Teacher.tenant_id == current_user.tenant_id,
                    Teacher.is_deleted == False,
                    Teacher.is_active == True,
                )
                .filter(
                    or_(
                        Teacher.user_id == current_user.id,
                        Teacher.email == current_user.email,
                    )
                )
                .first()
            )

            if teacher:
                if not teacher.class_id or not teacher.class_division_id:
                    return AttendanceReportResponse(
                        records=[],
                        summary=AttendanceReportSummary(
                            total_present=0,
                            total_absent=0,
                            total_half_day=0,
                            total_leave=0,
                        ),
                        total_count=0,
                    )
                class_id = teacher.class_id
                division_id = teacher.class_division_id

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
