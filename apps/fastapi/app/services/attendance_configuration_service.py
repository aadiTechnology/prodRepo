"""Attendance Configuration business logic.

Menu path used by Configuration Hub: /attendance/configuration
"""

from __future__ import annotations

from datetime import date
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException, ValidationException
from app.models.academic import AcademicYear
from app.models.attendance_configuration import (
    AttendanceConfigHoliday,
    AttendanceConfigNotification,
    AttendanceConfigShift,
    AttendanceConfigStatus,
    AttendanceConfiguration,
)
from app.repositories import attendance_configuration_repository as repo
from app.schemas.attendance_configuration_schema import (
    AttendanceConfigurationResponse,
    AttendanceConfigurationUpdateRequest,
    AttendanceMarkedBySchema,
    CheckInRulesSchema,
    GeneralConfigurationSchema,
    GraceTimeSchema,
    HolidayCreateRequest,
    HolidayResponse,
    HolidayUpdateRequest,
    NotificationResponse,
    NotificationToggleRequest,
    OfficeTimingSchema,
    ShiftCreateRequest,
    ShiftResponse,
    ShiftUpdateRequest,
    StatusCreateRequest,
    StatusResponse,
    StatusUpdateRequest,
    WorkingDaysSchema,
)

ATTENDANCE_CONFIGURATION_MENU_PATH = "/attendance/configuration"

CONFIGURATION_SCOPE_ENTIRE_SCHOOL = "entire-school"
APPLY_CHANGES_FUTURE_ONLY = "future-only"

DEFAULT_OFFICE_START = "09:00"
DEFAULT_OFFICE_END = "17:00"
DEFAULT_GRACE_MINUTES = 15
DEFAULT_MINIMUM_WORKING_HOURS = 6
DEFAULT_STATUS_AFTER_GRACE = "Late"

DEFAULT_STATUSES: list[tuple[str, str]] = [
    ("Present", "#22c55e"),
    ("Absent", "#ef4444"),
    ("Late", "#f59e0b"),
    ("Half Day", "#8b5cf6"),
    ("Leave", "#3b82f6"),
    ("Holiday", "#64748b"),
    ("Others", "#94a3b8"),
]

DEFAULT_SHIFTS: list[tuple[str, str, str]] = [
    ("Morning Shift", "08:00", "14:00"),
    ("Afternoon Shift", "12:00", "18:00"),
]

DEFAULT_NOTIFICATION_LABEL = "Missed Attendance Alert"
DEFAULT_NOTIFICATION_RECIPIENTS = "teacher,schoolAdmin"
DEFAULT_NOTIFICATION_TRIGGERS = "missedAttendance"
DEFAULT_NOTIFICATION_CHANNELS = "sms"


def _parse_hhmm(value: str, *, field: str) -> int:
    parts = value.strip().split(":")
    if len(parts) != 2:
        raise ValidationException(f"Invalid {field}. Expected HH:mm")
    try:
        hours = int(parts[0])
        minutes = int(parts[1])
    except ValueError as exc:
        raise ValidationException(f"Invalid {field}. Expected HH:mm") from exc
    if hours < 0 or hours > 23 or minutes < 0 or minutes > 59:
        raise ValidationException(f"Invalid {field}. Expected HH:mm")
    return hours * 60 + minutes


def _validate_time_range(start_time: str, end_time: str) -> None:
    start = _parse_hhmm(start_time, field="start_time")
    end = _parse_hhmm(end_time, field="end_time")
    if end <= start:
        raise ValidationException("end_time must be after start_time")


def _ensure_academic_year(db: Session, *, tenant_id: int, academic_year_id: int) -> AcademicYear:
    row = (
        db.query(AcademicYear)
        .filter(
            AcademicYear.id == academic_year_id,
            AcademicYear.tenant_id == tenant_id,
            AcademicYear.is_deleted == False,  # noqa: E712
        )
        .first()
    )
    if not row:
        raise ValidationException("Academic year not found for tenant")
    return row


def _split_csv(value: str) -> list[str]:
    if not value or not value.strip():
        return []
    return [part.strip() for part in value.split(",") if part.strip()]


def _seed_defaults(
    db: Session,
    *,
    tenant_id: int,
    configuration_id: int,
    user_id: int,
) -> None:
    for index, (name, color) in enumerate(DEFAULT_STATUSES):
        repo.create_status(
            db,
            tenant_id=tenant_id,
            configuration_id=configuration_id,
            user_id=user_id,
            name=name,
            color=color,
            is_active=True,
            sort_order=index,
        )
    for name, start_time, end_time in DEFAULT_SHIFTS:
        repo.create_shift(
            db,
            tenant_id=tenant_id,
            configuration_id=configuration_id,
            user_id=user_id,
            name=name,
            start_time=start_time,
            end_time=end_time,
            status="active",
        )
    repo.create_notification(
        db,
        tenant_id=tenant_id,
        configuration_id=configuration_id,
        user_id=user_id,
        label=DEFAULT_NOTIFICATION_LABEL,
        recipients=DEFAULT_NOTIFICATION_RECIPIENTS,
        triggers=DEFAULT_NOTIFICATION_TRIGGERS,
        channels=DEFAULT_NOTIFICATION_CHANNELS,
        is_enabled=True,
    )


def _get_or_create_configuration(
    db: Session,
    *,
    tenant_id: int,
    academic_year_id: int,
    user_id: int,
) -> AttendanceConfiguration:
    _ensure_academic_year(db, tenant_id=tenant_id, academic_year_id=academic_year_id)
    existing = repo.get_by_tenant_year(
        db, tenant_id=tenant_id, academic_year_id=academic_year_id
    )
    if existing:
        return existing

    row = repo.create_configuration(
        db,
        tenant_id=tenant_id,
        academic_year_id=academic_year_id,
        user_id=user_id,
    )
    _seed_defaults(
        db,
        tenant_id=tenant_id,
        configuration_id=row.id,
        user_id=user_id,
    )
    repo.commit(db)
    db.refresh(row)
    return row


def _to_holiday_response(row: AttendanceConfigHoliday) -> HolidayResponse:
    return HolidayResponse(
        id=row.id,
        name=row.name,
        holiday_date=row.holiday_date,
        description=row.description,
        status=row.status,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _to_shift_response(row: AttendanceConfigShift) -> ShiftResponse:
    return ShiftResponse(
        id=row.id,
        name=row.name,
        start_time=row.start_time,
        end_time=row.end_time,
        status=row.status,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _to_status_response(row: AttendanceConfigStatus) -> StatusResponse:
    return StatusResponse(
        id=row.id,
        name=row.name,
        color=row.color,
        is_active=row.is_active,
        sort_order=row.sort_order,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _to_notification_response(row: AttendanceConfigNotification) -> NotificationResponse:
    return NotificationResponse(
        id=row.id,
        label=row.label,
        recipients=_split_csv(row.recipients),  # type: ignore[arg-type]
        triggers=_split_csv(row.triggers),  # type: ignore[arg-type]
        channels=_split_csv(row.channels),  # type: ignore[arg-type]
        is_enabled=row.is_enabled,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _to_response(
    db: Session,
    row: AttendanceConfiguration,
) -> AttendanceConfigurationResponse:
    holidays = repo.list_holidays(
        db, tenant_id=row.tenant_id, configuration_id=row.id
    )
    shifts = repo.list_shifts(db, tenant_id=row.tenant_id, configuration_id=row.id)
    statuses = repo.list_statuses(
        db, tenant_id=row.tenant_id, configuration_id=row.id
    )
    notifications = repo.list_notifications(
        db, tenant_id=row.tenant_id, configuration_id=row.id
    )

    return AttendanceConfigurationResponse(
        id=row.id,
        tenant_id=row.tenant_id,
        general=GeneralConfigurationSchema(
            academic_year_id=row.academic_year_id,
            configuration_scope=row.configuration_scope,  # type: ignore[arg-type]
            allow_editing_after_marked=row.allow_editing_after_marked,
            apply_changes_to=row.apply_changes_to,  # type: ignore[arg-type]
            attendance_marked_by=AttendanceMarkedBySchema(
                teacher=row.marked_by_teacher,
                school_admin=row.marked_by_school_admin,
            ),
        ),
        working_days=WorkingDaysSchema(
            monday=row.working_monday,
            tuesday=row.working_tuesday,
            wednesday=row.working_wednesday,
            thursday=row.working_thursday,
            friday=row.working_friday,
            saturday=row.working_saturday,
            sunday=row.working_sunday,
        ),
        holidays=[_to_holiday_response(h) for h in holidays],
        shifts=[_to_shift_response(s) for s in shifts],
        office_timing=OfficeTimingSchema(
            start_time=row.office_start_time,
            end_time=row.office_end_time,
            minimum_working_hours=row.minimum_working_hours,
        ),
        grace_time=GraceTimeSchema(
            enabled=row.grace_enabled,
            grace_minutes=row.grace_minutes,
            status_after_grace=row.status_after_grace,
        ),
        statuses=[_to_status_response(s) for s in statuses],
        check_in_rules=CheckInRulesSchema(
            check_in_mandatory=row.check_in_mandatory,
            check_out_mandatory=row.check_out_mandatory,
            allow_attendance_without_check_out=row.allow_attendance_without_check_out,
            allow_multiple_check_in=row.allow_multiple_check_in,
            allow_next_day_check_out=row.allow_next_day_check_out,
            auto_calculate_working_hours=row.auto_calculate_working_hours,
        ),
        notifications=[_to_notification_response(n) for n in notifications],
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def get_configuration(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    academic_year_id: int,
) -> AttendanceConfigurationResponse:
    """Get configuration for tenant + academic year (creates defaults if missing)."""
    row = _get_or_create_configuration(
        db,
        tenant_id=tenant_id,
        academic_year_id=academic_year_id,
        user_id=user_id,
    )
    return _to_response(db, row)


def update_configuration(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    academic_year_id: int,
    payload: AttendanceConfigurationUpdateRequest,
) -> AttendanceConfigurationResponse:
    """Update scalar settings (general / working days / office / grace / check-in)."""
    row = _get_or_create_configuration(
        db,
        tenant_id=tenant_id,
        academic_year_id=academic_year_id,
        user_id=user_id,
    )

    fields: dict = {}

    if payload.allow_editing_after_marked is not None:
        fields["allow_editing_after_marked"] = payload.allow_editing_after_marked
    if payload.apply_changes_to is not None:
        fields["apply_changes_to"] = payload.apply_changes_to

    if payload.attendance_marked_by is not None:
        fields["marked_by_teacher"] = payload.attendance_marked_by.teacher
        fields["marked_by_school_admin"] = payload.attendance_marked_by.school_admin

    if payload.working_days is not None:
        wd = payload.working_days
        fields.update(
            {
                "working_monday": wd.monday,
                "working_tuesday": wd.tuesday,
                "working_wednesday": wd.wednesday,
                "working_thursday": wd.thursday,
                "working_friday": wd.friday,
                "working_saturday": wd.saturday,
                "working_sunday": wd.sunday,
            }
        )

    if payload.office_timing is not None:
        ot = payload.office_timing
        _validate_time_range(ot.start_time, ot.end_time)
        fields.update(
            {
                "office_start_time": ot.start_time.strip(),
                "office_end_time": ot.end_time.strip(),
                "minimum_working_hours": ot.minimum_working_hours,
            }
        )

    if payload.grace_time is not None:
        gt = payload.grace_time
        fields.update(
            {
                "grace_enabled": gt.enabled,
                "grace_minutes": gt.grace_minutes,
                "status_after_grace": gt.status_after_grace.strip(),
            }
        )

    if payload.check_in_rules is not None:
        cr = payload.check_in_rules
        fields.update(
            {
                "check_in_mandatory": cr.check_in_mandatory,
                "check_out_mandatory": cr.check_out_mandatory,
                "allow_attendance_without_check_out": cr.allow_attendance_without_check_out,
                "allow_multiple_check_in": cr.allow_multiple_check_in,
                "allow_next_day_check_out": cr.allow_next_day_check_out,
                "auto_calculate_working_hours": cr.auto_calculate_working_hours,
            }
        )

    if fields:
        repo.update_configuration(db, row, user_id=user_id, **fields)
        repo.commit(db)
        db.refresh(row)

    return _to_response(db, row)


# ---- Holidays ----


def create_holiday(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    academic_year_id: int,
    payload: HolidayCreateRequest,
) -> HolidayResponse:
    config = _get_or_create_configuration(
        db,
        tenant_id=tenant_id,
        academic_year_id=academic_year_id,
        user_id=user_id,
    )
    row = repo.create_holiday(
        db,
        tenant_id=tenant_id,
        configuration_id=config.id,
        user_id=user_id,
        name=payload.name,
        holiday_date=payload.holiday_date,
        description=payload.description,
        status=payload.status,
    )
    repo.commit(db)
    db.refresh(row)
    return _to_holiday_response(row)


def update_holiday(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    holiday_id: int,
    payload: HolidayUpdateRequest,
) -> HolidayResponse:
    row = repo.get_holiday(db, tenant_id=tenant_id, holiday_id=holiday_id)
    if not row:
        raise NotFoundException("AttendanceConfigHoliday", holiday_id)
    data = payload.model_dump(exclude_unset=True)
    repo.update_holiday(db, row, user_id=user_id, **data)
    repo.commit(db)
    db.refresh(row)
    return _to_holiday_response(row)


def delete_holiday(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    holiday_id: int,
) -> None:
    row = repo.get_holiday(db, tenant_id=tenant_id, holiday_id=holiday_id)
    if not row:
        raise NotFoundException("AttendanceConfigHoliday", holiday_id)
    repo.soft_delete_holiday(db, row, user_id=user_id)
    repo.commit(db)


# ---- Shifts ----


def create_shift(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    academic_year_id: int,
    payload: ShiftCreateRequest,
) -> ShiftResponse:
    _validate_time_range(payload.start_time, payload.end_time)
    config = _get_or_create_configuration(
        db,
        tenant_id=tenant_id,
        academic_year_id=academic_year_id,
        user_id=user_id,
    )
    row = repo.create_shift(
        db,
        tenant_id=tenant_id,
        configuration_id=config.id,
        user_id=user_id,
        name=payload.name,
        start_time=payload.start_time.strip(),
        end_time=payload.end_time.strip(),
        status=payload.status,
    )
    repo.commit(db)
    db.refresh(row)
    return _to_shift_response(row)


def update_shift(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    shift_id: int,
    payload: ShiftUpdateRequest,
) -> ShiftResponse:
    row = repo.get_shift(db, tenant_id=tenant_id, shift_id=shift_id)
    if not row:
        raise NotFoundException("AttendanceConfigShift", shift_id)
    data = payload.model_dump(exclude_unset=True)
    start = data.get("start_time", row.start_time)
    end = data.get("end_time", row.end_time)
    _validate_time_range(start, end)
    if "start_time" in data and isinstance(data["start_time"], str):
        data["start_time"] = data["start_time"].strip()
    if "end_time" in data and isinstance(data["end_time"], str):
        data["end_time"] = data["end_time"].strip()
    repo.update_shift(db, row, user_id=user_id, **data)
    repo.commit(db)
    db.refresh(row)
    return _to_shift_response(row)


def delete_shift(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    shift_id: int,
) -> None:
    row = repo.get_shift(db, tenant_id=tenant_id, shift_id=shift_id)
    if not row:
        raise NotFoundException("AttendanceConfigShift", shift_id)
    repo.soft_delete_shift(db, row, user_id=user_id)
    repo.commit(db)


# ---- Statuses ----


def create_status(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    academic_year_id: int,
    payload: StatusCreateRequest,
) -> StatusResponse:
    config = _get_or_create_configuration(
        db,
        tenant_id=tenant_id,
        academic_year_id=academic_year_id,
        user_id=user_id,
    )
    sort_order = repo.next_status_sort_order(
        db, tenant_id=tenant_id, configuration_id=config.id
    )
    row = repo.create_status(
        db,
        tenant_id=tenant_id,
        configuration_id=config.id,
        user_id=user_id,
        name=payload.name,
        color=payload.color,
        is_active=payload.is_active,
        sort_order=sort_order,
    )
    repo.commit(db)
    db.refresh(row)
    return _to_status_response(row)


def update_status(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    status_id: int,
    payload: StatusUpdateRequest,
) -> StatusResponse:
    row = repo.get_status(db, tenant_id=tenant_id, status_id=status_id)
    if not row:
        raise NotFoundException("AttendanceConfigStatus", status_id)
    data = payload.model_dump(exclude_unset=True)
    repo.update_status(db, row, user_id=user_id, **data)
    repo.commit(db)
    db.refresh(row)
    return _to_status_response(row)


def delete_status(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    status_id: int,
) -> None:
    row = repo.get_status(db, tenant_id=tenant_id, status_id=status_id)
    if not row:
        raise NotFoundException("AttendanceConfigStatus", status_id)
    repo.soft_delete_status(db, row, user_id=user_id)
    repo.commit(db)


# ---- Notifications ----


def toggle_notification(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    notification_id: int,
    payload: NotificationToggleRequest,
) -> NotificationResponse:
    row = repo.get_notification(
        db, tenant_id=tenant_id, notification_id=notification_id
    )
    if not row:
        raise NotFoundException("AttendanceConfigNotification", notification_id)
    repo.update_notification(
        db, row, user_id=user_id, is_enabled=payload.is_enabled
    )
    repo.commit(db)
    db.refresh(row)
    return _to_notification_response(row)



def get_holidays_for_calendar(
    db: Session,
    *,
    tenant_id: int,
    from_date: date,
    to_date: date,
) -> list[HolidayResponse]:
    """Get all active holidays in the date range for calendar display."""
    rows = (
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
    return [HolidayResponse.model_validate(row) for row in rows]
