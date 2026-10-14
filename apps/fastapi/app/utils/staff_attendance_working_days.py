"""Working-day rules for staff/teacher attendance (weekends + attendance config holidays)."""

from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.models.academic import AcademicYear
from app.models.attendance_configuration import (
    AttendanceConfigExtraWorkingDay,
    AttendanceConfigHoliday,
    AttendanceConfiguration,
)

_WEEKDAY_NAMES = (
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
)


def is_weekend(check_date: date) -> bool:
    """Check if date is a weekend (Saturday or Sunday)."""
    return check_date.weekday() >= 5


def _config_for_year(
    db: Session,
    *,
    tenant_id: int,
    academic_year_id: int,
) -> AttendanceConfiguration | None:
    return (
        db.query(AttendanceConfiguration)
        .filter(
            AttendanceConfiguration.tenant_id == tenant_id,
            AttendanceConfiguration.academic_year_id == academic_year_id,
            AttendanceConfiguration.is_deleted == False,  # noqa: E712
        )
        .first()
    )


def _get_active_config(
    db: Session,
    *,
    tenant_id: int,
) -> AttendanceConfiguration | None:
    """Use the same academic year the configuration screen saves by default."""
    from datetime import datetime

    today = datetime.now().date()
    active = (
        AcademicYear.tenant_id == tenant_id,
        AcademicYear.is_active == True,  # noqa: E712
        AcademicYear.is_deleted == False,  # noqa: E712
    )

    current_year = (
        db.query(AcademicYear)
        .filter(*active, AcademicYear.is_current == True)  # noqa: E712
        .order_by(AcademicYear.start_date.desc())
        .first()
    )
    if current_year:
        config = _config_for_year(
            db, tenant_id=tenant_id, academic_year_id=current_year.id
        )
        if config:
            return config

    dated_year = (
        db.query(AcademicYear)
        .filter(
            *active,
            AcademicYear.start_date <= today,
            AcademicYear.end_date >= today,
        )
        .first()
    )
    if dated_year:
        config = _config_for_year(
            db, tenant_id=tenant_id, academic_year_id=dated_year.id
        )
        if config:
            return config

    latest_year = (
        db.query(AcademicYear)
        .filter(*active)
        .order_by(AcademicYear.start_date.desc())
        .first()
    )
    if not latest_year:
        return None
    return _config_for_year(
        db, tenant_id=tenant_id, academic_year_id=latest_year.id
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


def _is_scheduled_non_working_date(
    db: Session,
    *,
    config: AttendanceConfiguration,
    check_date: date,
) -> bool:
    from app.repositories.attendance_configuration_repository import (
        is_non_working_date,
    )

    return is_non_working_date(
        db,
        tenant_id=config.tenant_id,
        configuration_id=config.id,
        work_date=check_date,
    )


def _is_effective_working_day(
    db: Session,
    *,
    config: AttendanceConfiguration,
    check_date: date,
) -> bool:
    if _is_scheduled_non_working_date(db, config=config, check_date=check_date):
        return False
    return _is_configured_working_day(config, check_date)


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
    return _is_effective_working_day(db, config=config, check_date=check_date)


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


def teacher_has_extra_working_day(
    db: Session,
    *,
    config: AttendanceConfiguration,
    teacher_id: int,
    check_date: date,
) -> bool:
    from app.repositories.attendance_configuration_repository import ensure_extra_working_table

    ensure_extra_working_table(db)
    weekday = _WEEKDAY_NAMES[check_date.weekday()]
    base = (
        AttendanceConfigExtraWorkingDay.tenant_id == config.tenant_id,
        AttendanceConfigExtraWorkingDay.configuration_id == config.id,
        AttendanceConfigExtraWorkingDay.teacher_id == teacher_id,
        AttendanceConfigExtraWorkingDay.is_deleted == False,  # noqa: E712
    )

    date_row = (
        db.query(AttendanceConfigExtraWorkingDay.id)
        .filter(*base, AttendanceConfigExtraWorkingDay.work_date == check_date)
        .first()
    )
    if date_row is not None:
        return True

    weekly_row = (
        db.query(AttendanceConfigExtraWorkingDay.id)
        .filter(
            *base,
            AttendanceConfigExtraWorkingDay.work_date.is_(None),
            AttendanceConfigExtraWorkingDay.weekday == weekday,
        )
        .first()
    )
    if weekly_row is None:
        return False

    non_working = not _is_effective_working_day(db, config=config, check_date=check_date)
    holiday = get_holiday_blocking_attendance(
        db, tenant_id=config.tenant_id, check_date=check_date
    )
    return non_working or holiday is not None


def get_staff_attendance_block_reason(
    db: Session,
    *,
    tenant_id: int,
    check_date: date,
    teacher_id: int | None = None,
) -> str | None:
    """
    Return blocking reason when staff attendance cannot be marked, else None.
    Respects AttendanceConfiguration working days and public holidays.
    A teacher listed as an extra working teacher may mark that weekday even when
    the school day is off or a public holiday. Other teachers stay blocked.
    """
    config = _get_active_config(db, tenant_id=tenant_id)
    non_working = bool(
        config and not _is_effective_working_day(db, config=config, check_date=check_date)
    )
    holiday = get_holiday_blocking_attendance(db, tenant_id=tenant_id, check_date=check_date)

    if teacher_id is not None and config and (non_working or holiday):
        if teacher_has_extra_working_day(
            db, config=config, teacher_id=teacher_id, check_date=check_date
        ):
            return None

    if non_working and config:
        day_name = check_date.strftime("%A")
        return f"Non-working day ({day_name})"

    if holiday:
        return f"Public Holiday: {holiday.name}"

    return None


def assert_staff_attendance_working_day(
    db: Session,
    *,
    tenant_id: int,
    check_date: date,
    teacher_id: int | None = None,
) -> None:
    """Raise HTTPException when attendance cannot be marked on check_date."""
    from fastapi import HTTPException

    reason = get_staff_attendance_block_reason(
        db, tenant_id=tenant_id, check_date=check_date, teacher_id=teacher_id
    )
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
