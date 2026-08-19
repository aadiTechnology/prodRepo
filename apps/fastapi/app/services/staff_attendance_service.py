from __future__ import annotations

from datetime import date

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException, ValidationException
from app.models.teacher import Teacher
from app.repositories import staff_attendance_repository as repo
from app.schemas.staff_attendance_schema import (
    StaffAttendanceApprovalRequest,
    StaffAttendanceListResponse,
    StaffAttendanceMarkRequest,
    StaffAttendanceResponse,
)
from app.models.academic import AcademicYear
from app.models.attendance_configuration import AttendanceConfiguration
from app.services.attendance_access import is_admin_like, is_teacher_like
from app.services import teacher_service
from app.utils.staff_attendance_working_days import assert_staff_attendance_working_day

DEFAULT_SHIFT_START = "09:00"
DEFAULT_SHIFT_END = "17:00"
DEFAULT_GRACE_MINUTES = 15
DEFAULT_STATUS_AFTER_GRACE = "Late"


class _TimingConfig:
    __slots__ = ("shift_start", "shift_end", "grace_enabled", "grace_minutes", "status_after_grace")

    def __init__(
        self,
        *,
        shift_start: str,
        shift_end: str,
        grace_enabled: bool,
        grace_minutes: int,
        status_after_grace: str,
    ) -> None:
        self.shift_start = shift_start
        self.shift_end = shift_end
        self.grace_enabled = grace_enabled
        self.grace_minutes = grace_minutes
        self.status_after_grace = status_after_grace


def _load_timing_config(db: Session, *, tenant_id: int) -> _TimingConfig:
    """Load office timing + grace settings from attendance configuration."""
    active_year = (
        db.query(AcademicYear)
        .filter(
            AcademicYear.tenant_id == tenant_id,
            AcademicYear.is_active == True,  # noqa: E712
            AcademicYear.is_deleted == False,  # noqa: E712
        )
        .order_by(AcademicYear.id.desc())
        .first()
    )
    if not active_year:
        return _TimingConfig(
            shift_start=DEFAULT_SHIFT_START,
            shift_end=DEFAULT_SHIFT_END,
            grace_enabled=True,
            grace_minutes=DEFAULT_GRACE_MINUTES,
            status_after_grace=DEFAULT_STATUS_AFTER_GRACE,
        )

    config = (
        db.query(AttendanceConfiguration)
        .filter(
            AttendanceConfiguration.tenant_id == tenant_id,
            AttendanceConfiguration.academic_year_id == active_year.id,
            AttendanceConfiguration.is_deleted == False,  # noqa: E712
        )
        .first()
    )
    if not config:
        return _TimingConfig(
            shift_start=DEFAULT_SHIFT_START,
            shift_end=DEFAULT_SHIFT_END,
            grace_enabled=True,
            grace_minutes=DEFAULT_GRACE_MINUTES,
            status_after_grace=DEFAULT_STATUS_AFTER_GRACE,
        )

    return _TimingConfig(
        shift_start=config.office_start_time or DEFAULT_SHIFT_START,
        shift_end=config.office_end_time or DEFAULT_SHIFT_END,
        grace_enabled=bool(config.grace_enabled),
        grace_minutes=int(config.grace_minutes or DEFAULT_GRACE_MINUTES),
        status_after_grace=config.status_after_grace or DEFAULT_STATUS_AFTER_GRACE,
    )


def _parse_hhmm(value: str | None, *, field: str) -> int | None:
    if value is None or value.strip() == "":
        return None
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


def _validate_attendance_times(check_in: str | None, check_out: str | None) -> None:
    """Allow in-progress check-in (check-in only); reject empty or check-out without check-in."""
    if check_out and not check_in:
        raise ValidationException("Check-in time is required when check-out is provided.")
    if not check_in and not check_out:
        raise ValidationException("Check-in and check-out times are required.")


def _resolve_approval_status(
    *,
    is_submitted: bool,
    status: str,
    is_admin: bool,
    existing,
    attendance_date: date,
) -> str:
    if not is_submitted:
        return existing.approval_status if existing else "Waiting for Approval"

    if is_admin:
        return "Approved"

    today = date.today()

    # Past-date marks always need admin approval (including Mark Attendance back-dates).
    if attendance_date < today:
        return "Waiting for Approval"

    # Today: completed check-in/out is auto-approved (excluded from approval queue).
    return "Approved"


def _derive_status(
    check_in_time: str | None,
    explicit: str | None,
    *,
    timing: _TimingConfig,
) -> str:
    """
    Derive Present/Late from check-in vs office start + grace from attendance config.

    When the client sends an explicit status other than Present/Late (e.g. Leave),
    keep it. Present/Late from the client are ignored so late calculation stays
    consistent with office timing (not a random shift assignment).
    """
    if explicit and explicit not in ("Present", "Late"):
        return explicit
    if not check_in_time:
        return "Present"
    if not timing.grace_enabled:
        return "Present"
    check_in = _parse_hhmm(check_in_time, field="check_in_time")
    shift_start = _parse_hhmm(timing.shift_start, field="shift_start") or 0
    if check_in is not None and check_in > shift_start + timing.grace_minutes:
        return timing.status_after_grace or DEFAULT_STATUS_AFTER_GRACE
    return "Present"


def _assert_teacher_in_tenant(db: Session, *, tenant_id: int, teacher_id: int) -> Teacher:
    teacher = (
        db.query(Teacher)
        .filter(
            Teacher.id == teacher_id,
            Teacher.tenant_id == tenant_id,
            Teacher.is_deleted == False,  # noqa: E712
        )
        .first()
    )
    if not teacher:
        raise NotFoundException("Teacher", teacher_id)
    return teacher


def _assert_can_access_teacher(
    db: Session,
    current_user,
    *,
    teacher_id: int,
) -> None:
    if is_admin_like(current_user, db):
        return
    if not is_teacher_like(current_user, db):
        raise ValidationException("Not authorized for staff attendance")

    self_teacher = teacher_service.resolve_teacher_for_user(
        db,
        current_user.tenant_id,
        current_user.id,
        getattr(current_user, "email", None),
    )
    if not self_teacher or int(self_teacher.id) != teacher_id:  # type: ignore[arg-type]
        raise ValidationException("Teachers can only access their own attendance")


def list_staff_attendance(
    db: Session,
    current_user,
    *,
    teacher_id: int | None,
    from_date: date | None,
    to_date: date | None,
) -> StaffAttendanceListResponse:
    tenant_id = current_user.tenant_id
    if tenant_id is None:
        raise ValidationException("Tenant context is required")

    if teacher_id is not None:
        _assert_can_access_teacher(db, current_user, teacher_id=teacher_id)
    elif not is_admin_like(current_user, db):
        self_teacher = teacher_service.resolve_teacher_for_user(
            db,
            tenant_id,
            current_user.id,
            getattr(current_user, "email", None),
        )
        if not self_teacher:
            raise ValidationException("Teacher profile not found")
        teacher_id = int(self_teacher.id)  # type: ignore[arg-type]

    rows = repo.list_records(
        db,
        tenant_id=tenant_id,
        teacher_id=teacher_id,
        from_date=from_date,
        to_date=to_date,
    )
    items = [StaffAttendanceResponse.model_validate(row) for row in rows]
    return StaffAttendanceListResponse(items=items, total=len(items))


def mark_staff_attendance(
    db: Session,
    current_user,
    payload: StaffAttendanceMarkRequest,
) -> StaffAttendanceResponse:
    tenant_id = current_user.tenant_id
    if tenant_id is None:
        raise ValidationException("Tenant context is required")

    if payload.attendance_date > date.today():
        raise ValidationException("Future date attendance is not allowed")

    # Validate working day (check for weekends and holidays)
    assert_staff_attendance_working_day(
        db,
        tenant_id=tenant_id,
        check_date=payload.attendance_date,
    )

    _assert_teacher_in_tenant(db, tenant_id=tenant_id, teacher_id=payload.teacher_id)
    _assert_can_access_teacher(db, current_user, teacher_id=payload.teacher_id)

    existing = repo.get_by_teacher_date(
        db,
        tenant_id=tenant_id,
        teacher_id=payload.teacher_id,
        attendance_date=payload.attendance_date,
    )
    if existing and existing.is_submitted and not is_admin_like(current_user, db):
        if existing.approval_status == "Waiting for Approval":
            raise ValidationException("Attendance is locked and waiting for approval")
        if existing.approval_status == "Approved":
            raise ValidationException("Approved attendance cannot be edited")

    # Admins may update even while waiting/approved (correction path).

    check_in = (payload.check_in_time or "").strip() or None
    check_out = (payload.check_out_time or "").strip() or None
    remarks = (payload.remarks or "").strip() or None

    _validate_attendance_times(check_in, check_out)

    check_in_min = _parse_hhmm(check_in, field="check_in_time")
    check_out_min = _parse_hhmm(check_out, field="check_out_time")
    if check_in_min is not None and check_out_min is not None and check_out_min < check_in_min:
        raise ValidationException("Check-out cannot happen before check-in")

    timing = _load_timing_config(db, tenant_id=tenant_id)

    working = None
    overtime = None
    if check_in_min is not None and check_out_min is not None:
        working = check_out_min - check_in_min
        shift_end = _parse_hhmm(timing.shift_end, field="shift_end") or 0
        overtime = max(0, (check_in_min + working) - shift_end)

    status = _derive_status(check_in, payload.status, timing=timing)
    is_submitted = bool(check_in and check_out)
    approval_status = _resolve_approval_status(
        is_submitted=is_submitted,
        status=status,
        is_admin=is_admin_like(current_user, db),
        existing=existing,
        attendance_date=payload.attendance_date,
    )

    row = repo.upsert_mark(
        db,
        tenant_id=tenant_id,
        teacher_id=payload.teacher_id,
        attendance_date=payload.attendance_date,
        status=status,
        check_in_time=check_in,
        check_out_time=check_out,
        remarks=remarks,
        working_hours_minutes=working,
        overtime_minutes=overtime,
        is_submitted=is_submitted,
        approval_status=approval_status if is_submitted else (
            existing.approval_status if existing else "Waiting for Approval"
        ),
        rejection_reason="" if is_submitted else (existing.rejection_reason if existing else None),
        user_id=current_user.id,
    )
    db.commit()
    db.refresh(row)
    return StaffAttendanceResponse.model_validate(row)


def update_approval(
    db: Session,
    current_user,
    *,
    record_id: int,
    payload: StaffAttendanceApprovalRequest,
) -> StaffAttendanceResponse:
    tenant_id = current_user.tenant_id
    if tenant_id is None:
        raise ValidationException("Tenant context is required")
    if not is_admin_like(current_user, db):
        raise ValidationException("Only admins can approve staff attendance")

    row = repo.get_by_id(db, tenant_id=tenant_id, record_id=record_id)
    if not row:
        raise NotFoundException("Staff attendance", record_id)
    if not row.is_submitted:
        raise ValidationException("Attendance must be submitted before approval")

    if payload.approval_status == "Rejected" and not (payload.rejection_reason or "").strip():
        raise ValidationException("Rejection reason is required")

    repo.update_approval(
        db,
        row,
        approval_status=payload.approval_status,
        rejection_reason=(payload.rejection_reason or "").strip() or None,
        user_id=current_user.id,
    )
    db.commit()
    db.refresh(row)
    return StaffAttendanceResponse.model_validate(row)
