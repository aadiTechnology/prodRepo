"""Working-day rules for staff/teacher attendance (weekends + attendance config holidays)."""

from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.models.academic import AcademicYear
from app.models.attendance_configuration import AttendanceConfiguration, AttendanceConfigHoliday


def is_weekend(check_date: date) -> bool:
    """Check if date is a weekend (Saturday or Sunday)."""
    return check_date.weekday() >= 5


def _get_active_config(
    db: Session,
    *,
    tenant_id: int,
) -> AttendanceConfiguration | None:
    # First try to get config for the CURRENT active academic year (ordered by date)
    from datetime import datetime
    today = datetime.now().date()
    
    active_year = (
        db.query(AcademicYear)
        .filter(
            AcademicYear.tenant_id == tenant_id,
            AcademicYear.is_active == True,  # noqa: E712
            AcademicYear.is_deleted == False,  # noqa: E712
            AcademicYear.start_date <= today,
            AcademicYear.end_date >= today,
        )
        .first()
    )
    
    # If no matching current year, try any active year that has a config
    if not active_year:
        # Get the most recent active academic year with a config
        active_year = (
            db.query(AcademicYear)
            .filter(
                AcademicYear.tenant_id == tenant_id,
                AcademicYear.is_active == True,  # noqa: E712
                AcademicYear.is_deleted == False,  # noqa: E712
            )
            .order_by(AcademicYear.start_date.desc())
            .first()
        )
    
    if not active_year:
        return None

    return (
        db.query(AttendanceConfiguration)
        .filter(
            AttendanceConfiguration.tenant_id == tenant_id,
            AttendanceConfiguration.academic_year_id == active_year.id,
            AttendanceConfiguration.is_deleted == False,  # noqa: E712
        )
        .first()
    )


def _is_configured_working_day(config: AttendanceConfiguration, check_date: date) -> bool:
    working_day_map = {
        0: config.working_monday,
        1: config.working_tuesday,
        2: config.working_wednesday,
        3: config.working_thursday,
        4: config.working_friday,
        5: config.working_saturday,
        6: config.working_sunday,
    }
    return bool(working_day_map.get(check_date.weekday(), False))


def is_working_day_for_tenant(
    db: Session,
    *,
    tenant_id: int,
    check_date: date,
) -> bool:
    """Return True when attendance config marks the date as a working day."""
    config = _get_active_config(db, tenant_id=tenant_id)
    if not config:
        return check_date.weekday() < 5
    return _is_configured_working_day(config, check_date)


def get_holiday_blocking_attendance(
    db: Session,
    *,
    tenant_id: int,
    check_date: date,
) -> AttendanceConfigHoliday | None:
    """Return active holiday on check_date, if any."""
    return (
        db.query(AttendanceConfigHoliday)
        .filter(
            AttendanceConfigHoliday.tenant_id == tenant_id,
            AttendanceConfigHoliday.holiday_date == check_date,
            AttendanceConfigHoliday.status == "active",
            AttendanceConfigHoliday.is_deleted == False,  # noqa: E712
        )
        .first()
    )


def get_staff_attendance_block_reason(
    db: Session,
    *,
    tenant_id: int,
    check_date: date,
) -> str | None:
    """
    Return blocking reason when staff attendance cannot be marked, else None.
    Respects AttendanceConfiguration working days and public holidays.
    """
    config = _get_active_config(db, tenant_id=tenant_id)
    if config and not _is_configured_working_day(config, check_date):
        day_name = check_date.strftime("%A")
        return f"Non-working day ({day_name})"

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
    """Raise HTTPException when attendance cannot be marked on check_date."""
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
    """Map ISO date strings to block reasons across the given range."""
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
) -> list[dict[str, str | date | int]]:
    """Return active holidays for tenant in the date range."""
    config = _get_active_config(db, tenant_id=tenant_id)
    if not config:
        return []

    holidays = (
        db.query(AttendanceConfigHoliday)
        .filter(
            AttendanceConfigHoliday.tenant_id == tenant_id,
            AttendanceConfigHoliday.configuration_id == config.id,
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
