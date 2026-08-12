"""Working-day rules for staff/teacher attendance (weekends + attendance config holidays)."""

from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.models.attendance_configuration import AttendanceConfigHoliday


def is_weekend(check_date: date) -> bool:
    """Check if date is a weekend (Saturday or Sunday)."""
    return check_date.weekday() >= 5


def get_holiday_blocking_attendance(
    db: Session,
    *,
    tenant_id: int,
    check_date: date,
) -> AttendanceConfigHoliday | None:
    """
    Check if there's an active holiday on the given date that blocks staff attendance.
    
    Args:
        db: Database session
        tenant_id: Tenant ID
        check_date: Date to check
        
    Returns:
        AttendanceConfigHoliday if holiday blocks attendance, None otherwise
    """
    holiday = (
        db.query(AttendanceConfigHoliday)
        .filter(
            AttendanceConfigHoliday.tenant_id == tenant_id,
            AttendanceConfigHoliday.holiday_date == check_date,
            AttendanceConfigHoliday.status == "active",
            AttendanceConfigHoliday.is_deleted == False,  # noqa: E712
        )
        .first()
    )
    return holiday


def get_staff_attendance_block_reason(
    db: Session,
    *,
    tenant_id: int,
    check_date: date,
) -> str | None:
    """
    Get the reason why staff attendance cannot be marked on this date.
    
    Args:
        db: Database session
        tenant_id: Tenant ID
        check_date: Date to check
        
    Returns:
        Blocking reason string if attendance cannot be marked, None if it can
    """
    if is_weekend(check_date):
        return "Weekend"

    holiday = get_holiday_blocking_attendance(db, tenant_id=tenant_id, check_date=check_date)
    if holiday:
        return f"Public Holiday: {holiday.name}"

    return None


def assert_staff_attendance_working_day(
    db: Session,
    *,
    tenant_id: int,
    check_date: date,
) -> None:
    """
    Validate that staff attendance can be marked on the given date.
    Raises HTTPException if the date is not a working day.
    
    Args:
        db: Database session
        tenant_id: Tenant ID
        check_date: Date to validate
        
    Raises:
        HTTPException: If attendance cannot be marked (weekend or holiday)
    """
    from fastapi import HTTPException

    reason = get_staff_attendance_block_reason(db, tenant_id=tenant_id, check_date=check_date)
    if reason:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot mark attendance on non-working days ({reason})",
        )


def collect_staff_non_working_dates(
    db: Session,
    *,
    tenant_id: int,
    from_date: date,
    to_date: date,
) -> dict[str, str]:
    """
    Collect all non-working dates (weekends + holidays) in the given range.
    
    Args:
        db: Database session
        tenant_id: Tenant ID
        from_date: Start date (inclusive)
        to_date: End date (inclusive)
        
    Returns:
        Dictionary mapping date string (ISO format) to reason string
        Example: {"2026-08-15": "Public Holiday: Independence day"}
    """
    if to_date < from_date:
        return {}

    blocked: dict[str, str] = {}
    current = from_date
    while current <= to_date:
        reason = get_staff_attendance_block_reason(db, tenant_id=tenant_id, check_date=current)
        if reason:
            blocked[current.isoformat()] = reason
        current += timedelta(days=1)
    return blocked


def get_holidays_for_range(
    db: Session,
    *,
    tenant_id: int,
    from_date: date,
    to_date: date,
) -> list[dict[str, str | date]]:
    """
    Get all active holidays in the given date range.
    
    Args:
        db: Database session
        tenant_id: Tenant ID
        from_date: Start date (inclusive)
        to_date: End date (inclusive)
        
    Returns:
        List of dictionaries with holiday information
        Example: [{"id": 1, "name": "Independence day", "date": date(2026, 8, 15), "description": "test"}]
    """
    holidays = (
        db.query(AttendanceConfigHoliday)
        .filter(
            AttendanceConfigHoliday.tenant_id == tenant_id,
            AttendanceConfigHoliday.holiday_date >= from_date,
            AttendanceConfigHoliday.holiday_date <= to_date,
            AttendanceConfigHoliday.status == "active",
            AttendanceConfigHoliday.is_deleted == False,  # noqa: E712
        )
        .order_by(AttendanceConfigHoliday.holiday_date)
        .all()
    )
    
    return [
        {
            "id": h.id,
            "name": h.name,
            "date": h.holiday_date,
            "description": h.description or "",
        }
        for h in holidays
    ]
