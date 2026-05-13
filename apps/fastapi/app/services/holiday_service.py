from __future__ import annotations

from datetime import datetime

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException, ValidationException
from app.models.academic import AcademicYear
from app.models.holiday import Holiday
from app.schemas.holiday import (
    HolidayCreateRequest,
    HolidayListItem,
    HolidayListResponse,
    HolidayResponse,
    HolidaySummary,
    HolidayUpdateRequest,
)


def _validate_dates(start_date, end_date) -> None:
    if end_date and end_date < start_date:
        raise ValidationException("End date cannot be before start date")


def _ensure_academic_year(db: Session, tenant_id: int, academic_year_id: int) -> None:
    exists = (
        db.query(AcademicYear.id)
        .filter(
            AcademicYear.id == academic_year_id,
            AcademicYear.tenant_id == tenant_id,
            AcademicYear.is_deleted == False,  # noqa: E712
        )
        .first()
    )
    if not exists:
        raise ValidationException("Academic year not found for tenant")


def _format_holiday_date(start_date, end_date) -> str:
    if end_date and end_date != start_date:
        return f"{start_date.isoformat()} to {end_date.isoformat()}"
    return start_date.isoformat()


def _to_response(row: Holiday) -> HolidayResponse:
    return HolidayResponse.model_validate(row)


def get_holiday(db: Session, *, tenant_id: int | None, holiday_id: int) -> HolidayResponse:
    if tenant_id is None:
        raise ValidationException("User does not belong to a tenant")
    row = (
        db.query(Holiday)
        .filter(Holiday.id == holiday_id, Holiday.tenant_id == tenant_id, Holiday.is_active == True)  # noqa: E712
        .first()
    )
    if not row:
        raise NotFoundException("Holiday", holiday_id)
    return _to_response(row)


def list_holidays(
    db: Session,
    *,
    tenant_id: int | None,
    academic_year_id: int,
    holiday_type: str | None,
    search: str | None,
    page: int,
    page_size: int,
) -> HolidayListResponse:
    if tenant_id is None:
        raise ValidationException("User does not belong to a tenant")
    base_query = db.query(Holiday).filter(
        Holiday.tenant_id == tenant_id,
        Holiday.academic_year_id == academic_year_id,
        Holiday.is_active == True,  # noqa: E712
    )

    if holiday_type:
        base_query = base_query.filter(Holiday.holiday_type == holiday_type)

    if search:
        search_text = f"%{search.strip()}%"
        base_query = base_query.filter(
            or_(
                Holiday.holiday_name.ilike(search_text),
                Holiday.applicable_for.ilike(search_text),
            )
        )

    total = base_query.count()

    summary_rows = (
        base_query.with_entities(Holiday.holiday_type, func.count(Holiday.id))
        .group_by(Holiday.holiday_type)
        .all()
    )
    summary_map = {row[0]: int(row[1]) for row in summary_rows}

    rows = (
        base_query.order_by(Holiday.start_date.asc(), Holiday.id.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    data = [
        HolidayListItem(
            id=row.id,
            holiday_name=row.holiday_name,
            holiday_date=_format_holiday_date(row.start_date, row.end_date),
            holiday_type=row.holiday_type,
            applicable_for=row.applicable_for,
        )
        for row in rows
    ]

    return HolidayListResponse(
        summary=HolidaySummary(
            total_holidays=total,
            public_holidays=summary_map.get("PUBLIC_HOLIDAY", 0),
            academic_breaks=summary_map.get("ACADEMIC_BREAK", 0),
            non_teaching=summary_map.get("NON_TEACHING_DAY", 0),
        ),
        data=data,
        total=total,
    )


def create_holiday(
    db: Session,
    *,
    tenant_id: int,
    payload: HolidayCreateRequest,
) -> HolidayResponse:
    _ensure_academic_year(db, tenant_id, payload.academic_year_id)

    end_date = payload.end_date or payload.start_date
    _validate_dates(payload.start_date, end_date)

    row = Holiday(
        tenant_id=tenant_id,
        academic_year_id=payload.academic_year_id,
        holiday_name=payload.holiday_name.strip(),
        holiday_type=payload.holiday_type,
        start_date=payload.start_date,
        end_date=end_date,
        applicable_for=payload.applicable_for.strip(),
        description=payload.description.strip() if payload.description else None,
        is_active=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_response(row)


def update_holiday(
    db: Session,
    *,
    tenant_id: int,
    holiday_id: int,
    payload: HolidayUpdateRequest,
) -> HolidayResponse:
    row = (
        db.query(Holiday)
        .filter(Holiday.id == holiday_id, Holiday.tenant_id == tenant_id, Holiday.is_active == True)  # noqa: E712
        .first()
    )
    if not row:
        raise ValidationException("Holiday not found")

    update_data = payload.model_dump(exclude_unset=True)
    next_start_date = update_data.get("start_date", row.start_date)
    next_end_date = update_data.get("end_date", row.end_date or next_start_date)
    if next_end_date is None:
        next_end_date = next_start_date

    _validate_dates(next_start_date, next_end_date)

    next_academic_year_id = update_data.get("academic_year_id", row.academic_year_id)
    _ensure_academic_year(db, tenant_id, next_academic_year_id)

    row.academic_year_id = next_academic_year_id
    row.holiday_name = (
        update_data["holiday_name"].strip()
        if "holiday_name" in update_data and update_data["holiday_name"] is not None
        else row.holiday_name
    )
    row.holiday_type = update_data.get("holiday_type", row.holiday_type)
    row.start_date = next_start_date
    row.end_date = next_end_date
    row.applicable_for = (
        update_data["applicable_for"].strip()
        if "applicable_for" in update_data and update_data["applicable_for"] is not None
        else row.applicable_for
    )
    if "description" in update_data:
        row.description = update_data["description"].strip() if update_data["description"] else None
    if "is_active" in update_data and update_data["is_active"] is not None:
        row.is_active = update_data["is_active"]
    row.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(row)
    return _to_response(row)


def delete_holiday(db: Session, *, tenant_id: int, holiday_id: int) -> None:
    row = (
        db.query(Holiday)
        .filter(Holiday.id == holiday_id, Holiday.tenant_id == tenant_id, Holiday.is_active == True)  # noqa: E712
        .first()
    )
    if not row:
        return

    row.is_active = False
    row.updated_at = datetime.utcnow()
    db.commit()
