from __future__ import annotations

import csv
import io
from calendar import month_name, monthrange
from collections import defaultdict
from datetime import date, timedelta
from typing import IO

from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.core.exceptions import ValidationException
from app.models.academic import AcademicYear
from app.models.holiday import Holiday
from app.services.homework_access import resolve_homework_viewer_context
from app.schemas.academic_calendar import (
    AcademicCalendarDayItem,
    AcademicCalendarResponse,
    AcademicCalendarStatus,
    HolidayRowStatus,
)
from app.utils.holiday_storage import unpack_holiday_description

_MIN_YEAR = 2000
_MAX_YEAR = 2100


def _month_window(year: int, month: int) -> tuple[date, date]:
    last = monthrange(year, month)[1]
    return date(year, month, 1), date(year, month, last)


def _daterange_inclusive(start: date, end: date) -> list[date]:
    if end < start:
        return []
    n = (end - start).days + 1
    return [start + timedelta(days=i) for i in range(n)]


def _display_holiday_type(row: Holiday) -> str:
    _, _, _, _, htype_label, _ = unpack_holiday_description(getattr(row, "description", None))
    return (htype_label or row.holiday_type or "").strip() or "UNKNOWN"


def _month_overlaps_academic_year(month_start: date, month_end: date, ay_start: date, ay_end: date) -> bool:
    return not (month_end < ay_start or month_start > ay_end)


def _date_outside_academic_year(d: date, ay_start: date, ay_end: date) -> bool:
    return d < ay_start or d > ay_end


def _ensure_tenant(tenant_id: int | None) -> int:
    if tenant_id is None:
        raise ValidationException("User does not belong to a tenant")
    return tenant_id


def _load_academic_year(db: Session, *, tenant_id: int, academic_year_id: int) -> AcademicYear:
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


def _validate_calendar_year_month(year: int, month: int) -> None:
    if year < _MIN_YEAR or year > _MAX_YEAR:
        raise ValidationException(f"year must be between {_MIN_YEAR} and {_MAX_YEAR}")
    if month < 1 or month > 12:
        raise ValidationException("month must be between 1 and 12")
    try:
        monthrange(year, month)
    except ValueError as exc:
        raise ValidationException("Invalid year/month combination") from exc


def _holiday_visible_for_viewer(
    *,
    audience_type: str,
    class_ids: list[int],
    division_ids: list[int],
    viewer_kind: str,
    viewer_scopes: set[tuple[int, int | None]],
) -> bool:
    if viewer_kind == "admin":
        return True

    # Students/parents should not see staff-only holidays.
    if audience_type in {"TEACHER", "ADMIN"}:
        return False

    if not viewer_scopes:
        return False

    # For student-targeted audiences, match class/division targeting.
    if audience_type in {"STUDENT", "ALL"}:
        for class_id, div_id in viewer_scopes:
            if div_id is not None and div_id in division_ids:
                return True
            if class_id in class_ids:
                return True
        return False

    # Unknown/legacy audience values are hidden for non-admin viewers.
    return False


def get_academic_calendar(
    db: Session,
    *,
    tenant_id: int | None,
    user_id: int,
    user_email: str,
    user_role: object,
    year: int,
    month: int,
    academic_year_id: int,
    page: int,
    page_size: int,
) -> AcademicCalendarResponse:
    tid = _ensure_tenant(tenant_id)
    _validate_calendar_year_month(year, month)

    ay = _load_academic_year(db, tenant_id=tid, academic_year_id=academic_year_id)
    month_start, month_end = _month_window(year, month)

    overlaps = _month_overlaps_academic_year(month_start, month_end, ay.start_date, ay.end_date)
    academic_status = AcademicCalendarStatus.ACTIVE if overlaps else AcademicCalendarStatus.CLOSED

    overlap_filter = and_(
        Holiday.start_date <= month_end,
        or_(Holiday.end_date.is_(None), Holiday.end_date >= month_start),
    )

    rows = (
        db.query(Holiday)
        .filter(
            Holiday.tenant_id == tid,
            Holiday.academic_year_id == academic_year_id,
            Holiday.is_active == True,  # noqa: E712
            overlap_filter,
        )
        .order_by(Holiday.start_date.asc(), Holiday.id.asc())
        .all()
    )

    viewer_context = resolve_homework_viewer_context(
        db,
        tenant_id=tid,
        user_id=user_id,
        email=user_email,
        legacy_role=user_role,
        teacher_id=None,
    )
    viewer_scopes = {
        (int(scope.class_id), int(scope.class_division_id) if scope.class_division_id is not None else None)
        for scope in viewer_context.scopes
    }

    by_day: dict[date, dict] = defaultdict(
        lambda: {"names": [], "types": [], "any_active": False, "ids": set()}
    )

    for h in rows:
        aud, class_ids, division_ids, _, _, _ = unpack_holiday_description(getattr(h, "description", None))
        audience_type = (aud or "STUDENT").strip().upper()
        if not _holiday_visible_for_viewer(
            audience_type=audience_type,
            class_ids=class_ids,
            division_ids=division_ids,
            viewer_kind=viewer_context.kind,
            viewer_scopes=viewer_scopes,
        ):
            continue

        h_end = h.end_date or h.start_date
        seg_start = max(h.start_date, month_start)
        seg_end = min(h_end, month_end)
        for d in _daterange_inclusive(seg_start, seg_end):
            bucket = by_day[d]
            if h.id not in bucket["ids"]:
                bucket["ids"].add(h.id)
                bucket["names"].append(h.holiday_name.strip())
                bucket["types"].append(_display_holiday_type(h))
            if h.is_active:
                bucket["any_active"] = True

    merged: list[AcademicCalendarDayItem] = []
    for d in sorted(by_day.keys()):
        b = by_day[d]
        unique_names = list(dict.fromkeys(b["names"]))
        unique_types = list(dict.fromkeys(b["types"]))
        merged.append(
            AcademicCalendarDayItem(
                date=d.isoformat(),
                day=d.day,
                holiday_name=", ".join(unique_names),
                holiday_type=", ".join(unique_types),
                status=HolidayRowStatus.ACTIVE if b["any_active"] else HolidayRowStatus.INACTIVE,
                outside_academic_year=_date_outside_academic_year(d, ay.start_date, ay.end_date),
            )
        )

    total = len(merged)
    start_idx = (page - 1) * page_size
    slice_rows = merged[start_idx : start_idx + page_size]

    return AcademicCalendarResponse(
        month=month_name[month],
        year=year,
        academic_status=academic_status,
        page=page,
        page_size=page_size,
        total=total,
        data=slice_rows,
    )


def export_academic_calendar_csv(
    db: Session,
    *,
    tenant_id: int | None,
    year: int,
    academic_year_id: int,
) -> tuple[str, IO[str]]:
    tid = _ensure_tenant(tenant_id)
    if year < _MIN_YEAR or year > _MAX_YEAR:
        raise ValidationException(f"year must be between {_MIN_YEAR} and {_MAX_YEAR}")

    ay = _load_academic_year(db, tenant_id=tid, academic_year_id=academic_year_id)
    year_start = date(year, 1, 1)
    year_end = date(year, 12, 31)

    overlap_filter = and_(
        Holiday.start_date <= year_end,
        or_(Holiday.end_date.is_(None), Holiday.end_date >= year_start),
    )

    rows = (
        db.query(Holiday)
        .filter(
            Holiday.tenant_id == tid,
            Holiday.academic_year_id == academic_year_id,
            Holiday.is_active == True,  # noqa: E712
            overlap_filter,
        )
        .order_by(Holiday.start_date.asc(), Holiday.id.asc())
        .all()
    )

    by_day: dict[date, dict] = defaultdict(
        lambda: {"names": [], "types": [], "any_active": False, "ids": set()}
    )
    for h in rows:
        h_end = h.end_date or h.start_date
        seg_start = max(h.start_date, year_start)
        seg_end = min(h_end, year_end)
        for d in _daterange_inclusive(seg_start, seg_end):
            bucket = by_day[d]
            if h.id not in bucket["ids"]:
                bucket["ids"].add(h.id)
                bucket["names"].append(h.holiday_name.strip())
                bucket["types"].append(_display_holiday_type(h))
            if h.is_active:
                bucket["any_active"] = True

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        [
            "date",
            "holiday_name",
            "holiday_type",
            "status",
            "outside_academic_year",
            "academic_year_code",
        ]
    )

    for d in sorted(by_day.keys()):
        b = by_day[d]
        unique_names = ", ".join(dict.fromkeys(b["names"]))
        unique_types = ", ".join(dict.fromkeys(b["types"]))
        writer.writerow(
            [
                d.isoformat(),
                unique_names,
                unique_types,
                HolidayRowStatus.ACTIVE.value if b["any_active"] else HolidayRowStatus.INACTIVE.value,
                str(_date_outside_academic_year(d, ay.start_date, ay.end_date)).lower(),
                ay.code,
            ]
        )

    filename = f"academic-calendar-{year}-ay{academic_year_id}.csv"
    buf.seek(0)
    return filename, buf
