"""Attendance Configuration APIs used by Configuration Hub → Attendance Configuration."""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import CurrentUser, get_current_user
from app.schemas.attendance_configuration_schema import (
    AttendanceConfigurationResponse,
    AttendanceConfigurationUpdateRequest,
    HolidayCreateRequest,
    HolidayResponse,
    HolidayUpdateRequest,
    NotificationResponse,
    NotificationToggleRequest,
    ShiftCreateRequest,
    ShiftResponse,
    ShiftUpdateRequest,
    StatusCreateRequest,
    StatusResponse,
    StatusUpdateRequest,
)
from app.services import attendance_configuration_service as service

router = APIRouter(
    prefix="/api/attendance/configuration",
    tags=["Attendance Configuration"],
)


@router.get(
    "",
    response_model=AttendanceConfigurationResponse,
    summary="Get attendance configuration",
    description=(
        "Returns the attendance configuration for the current tenant and academic year. "
        "Creates a row with default shifts, statuses, and notifications when none exists."
    ),
)
def get_attendance_configuration(
    academic_year_id: int = Query(..., ge=1, description="Academic year id"),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    return service.get_configuration(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        academic_year_id=academic_year_id,
    )


@router.put(
    "",
    response_model=AttendanceConfigurationResponse,
    summary="Update attendance configuration settings",
    description=(
        "Updates general, working days, office timing, grace time, and check-in rules. "
        "Child lists (holidays, shifts, statuses, notifications) use their own endpoints."
    ),
)
def update_attendance_configuration(
    payload: AttendanceConfigurationUpdateRequest,
    academic_year_id: int = Query(..., ge=1, description="Academic year id"),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    return service.update_configuration(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        academic_year_id=academic_year_id,
        payload=payload,
    )


# ---- Holidays ----


@router.post(
    "/holidays",
    response_model=HolidayResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add public holiday",
)
def create_holiday(
    payload: HolidayCreateRequest,
    academic_year_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    return service.create_holiday(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        academic_year_id=academic_year_id,
        payload=payload,
    )


@router.put(
    "/holidays/{holiday_id}",
    response_model=HolidayResponse,
    summary="Update public holiday",
)
def update_holiday(
    holiday_id: int,
    payload: HolidayUpdateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    return service.update_holiday(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        holiday_id=holiday_id,
        payload=payload,
    )


@router.delete(
    "/holidays/{holiday_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete public holiday",
)
def delete_holiday(
    holiday_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    service.delete_holiday(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        holiday_id=holiday_id,
    )
    return None


# ---- Shifts ----


@router.post(
    "/shifts",
    response_model=ShiftResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add shift",
)
def create_shift(
    payload: ShiftCreateRequest,
    academic_year_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    return service.create_shift(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        academic_year_id=academic_year_id,
        payload=payload,
    )


@router.put(
    "/shifts/{shift_id}",
    response_model=ShiftResponse,
    summary="Update shift",
)
def update_shift(
    shift_id: int,
    payload: ShiftUpdateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    return service.update_shift(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        shift_id=shift_id,
        payload=payload,
    )


@router.delete(
    "/shifts/{shift_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete shift",
)
def delete_shift(
    shift_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    service.delete_shift(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        shift_id=shift_id,
    )
    return None


# ---- Statuses ----


@router.post(
    "/statuses",
    response_model=StatusResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add attendance status",
)
def create_status(
    payload: StatusCreateRequest,
    academic_year_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    return service.create_status(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        academic_year_id=academic_year_id,
        payload=payload,
    )


@router.put(
    "/statuses/{status_id}",
    response_model=StatusResponse,
    summary="Update attendance status",
)
def update_status(
    status_id: int,
    payload: StatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    return service.update_status(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        status_id=status_id,
        payload=payload,
    )


@router.delete(
    "/statuses/{status_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete attendance status",
)
def delete_status(
    status_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    service.delete_status(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        status_id=status_id,
    )
    return None


# ---- Notifications ----


@router.patch(
    "/notifications/{notification_id}",
    response_model=NotificationResponse,
    summary="Toggle notification setting",
)
def toggle_notification(
    notification_id: int,
    payload: NotificationToggleRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    return service.toggle_notification(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        notification_id=notification_id,
        payload=payload,
    )


# ── Holiday Calendar Endpoints ───────────────────────────────────────────────

@router.get(
    "/holidays/calendar",
    response_model=list[HolidayResponse],
    summary="Get holidays for calendar display",
    description=(
        "Returns all active holidays in the specified date range for calendar display. "
        "Used by teacher attendance calendar to show public holidays."
    ),
)
def get_holidays_for_calendar(
    from_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    to_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Get holidays for calendar display in teacher attendance.
    
    This endpoint is used by the teacher attendance calendar to:
    - Display holiday indicators on calendar dates
    - Show holiday names in tooltips
    - Prevent marking attendance on holidays
    
    Args:
        from_date: Start date in YYYY-MM-DD format
        to_date: End date in YYYY-MM-DD format
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        List of HolidayResponse objects for the date range
    """
    from datetime import datetime
    
    try:
        start = datetime.strptime(from_date, "%Y-%m-%d").date()
        end = datetime.strptime(to_date, "%Y-%m-%d").date()
    except ValueError:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=400,
            detail="Invalid date format. Use YYYY-MM-DD"
        )
    
    return service.get_holidays_for_calendar(
        db,
        tenant_id=current_user.tenant_id,
        from_date=start,
        to_date=end,
    )
