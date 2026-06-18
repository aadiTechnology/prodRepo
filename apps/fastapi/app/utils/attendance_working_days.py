"""Working-day rules for student attendance (weekends + scoped holidays)."""

from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.models.holiday import Holiday
from app.utils.holiday_storage import unpack_holiday_description


def is_weekend(check_date: date) -> bool:
    return check_date.weekday() >= 5


def _holiday_blocks_attendance(
    *,
    audience_type: str | None,
    class_ids: list[int],
    division_ids: list[int],
    class_id: int,
    division_id: int,
) -> bool:
    audience = (audience_type or "STUDENT").strip().upper()
    if audience in {"TEACHER", "ADMIN"}:
        return False

    if not class_ids and not division_ids:
        return audience in {"STUDENT", "ALL"} or audience_type is None

    if division_id in division_ids:
        return True
    if class_id in class_ids:
        return True
    return False


def _holiday_overlaps_date(row: Holiday, check_date: date) -> bool:
    end_d = row.end_date or row.start_date
    return row.start_date <= check_date <= end_d


def get_attendance_block_reason(
    db: Session,
    *,
    tenant_id: int,
    academic_year_id: int,
    class_id: int,
    division_id: int,
    check_date: date,
) -> str | None:
    if is_weekend(check_date):
        return "Weekend"

    holidays = (
        db.query(Holiday)
        .filter(
            Holiday.tenant_id == tenant_id,
            Holiday.academic_year_id == academic_year_id,
            Holiday.is_active == True,  # noqa: E712
            Holiday.start_date <= check_date,
        )
        .all()
    )

    for row in holidays:
        if not _holiday_overlaps_date(row, check_date):
            continue
        aud, class_ids, division_ids, _, _ = unpack_holiday_description(
            getattr(row, "description", None)
        )
        if _holiday_blocks_attendance(
            audience_type=aud,
            class_ids=class_ids,
            division_ids=division_ids,
            class_id=class_id,
            division_id=division_id,
        ):
            return f"Holiday: {row.holiday_name}"

    return None


def assert_attendance_working_day(
    db: Session,
    *,
    tenant_id: int,
    academic_year_id: int,
    class_id: int,
    division_id: int,
    check_date: date,
) -> None:
    from fastapi import HTTPException

    reason = get_attendance_block_reason(
        db,
        tenant_id=tenant_id,
        academic_year_id=academic_year_id,
        class_id=class_id,
        division_id=division_id,
        check_date=check_date,
    )
    if reason:
        raise HTTPException(
            status_code=400,
            detail=f"Attendance cannot be marked on non-working days ({reason})",
        )


def collect_non_working_dates(
    db: Session,
    *,
    tenant_id: int,
    academic_year_id: int,
    class_id: int,
    division_id: int,
    from_date: date,
    to_date: date,
) -> dict[str, str]:
    if to_date < from_date:
        return {}

    blocked: dict[str, str] = {}
    current = from_date
    while current <= to_date:
        reason = get_attendance_block_reason(
            db,
            tenant_id=tenant_id,
            academic_year_id=academic_year_id,
            class_id=class_id,
            division_id=division_id,
            check_date=current,
        )
        if reason:
            blocked[current.isoformat()] = reason
        current += timedelta(days=1)
    return blocked
