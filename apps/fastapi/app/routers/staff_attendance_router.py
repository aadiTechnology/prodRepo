"""Staff / Teacher attendance APIs used by Teacher Attendance → Mark Attendance."""

from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import CurrentUser, get_current_user
from app.schemas.staff_attendance_schema import (
    StaffAttendanceApprovalRequest,
    StaffAttendanceListResponse,
    StaffAttendanceMarkRequest,
    StaffAttendanceResponse,
)
from app.services import staff_attendance_service

router = APIRouter(prefix="/api/staff-attendance", tags=["Staff Attendance"])


@router.get("", response_model=StaffAttendanceListResponse)
def list_staff_attendance(
    teacher_id: int | None = Query(None, ge=1),
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """List staff attendance rows for a teacher/date range (tenant-scoped)."""
    return staff_attendance_service.list_staff_attendance(
        db,
        current_user,
        teacher_id=teacher_id,
        from_date=from_date,
        to_date=to_date,
    )


@router.post("/mark", response_model=StaffAttendanceResponse, status_code=status.HTTP_200_OK)
def mark_staff_attendance(
    payload: StaffAttendanceMarkRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Upsert one teacher attendance day (check-in / check-out / remarks)."""
    return staff_attendance_service.mark_staff_attendance(db, current_user, payload)


@router.patch("/{record_id}/approval", response_model=StaffAttendanceResponse)
def update_staff_attendance_approval(
    record_id: int,
    payload: StaffAttendanceApprovalRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Approve or reject a submitted staff attendance record (admin only)."""
    return staff_attendance_service.update_approval(
        db,
        current_user,
        record_id=record_id,
        payload=payload,
    )
