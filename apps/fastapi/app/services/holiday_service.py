from __future__ import annotations

import json
from datetime import date, datetime

from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException, ValidationException
from app.models.academic import AcademicYear, ClassDivision, SchoolClass
from app.models.holiday import Holiday
from app.schemas.holiday import (
    HolidayCreateRequest,
    HolidayListItem,
    HolidayListResponse,
    HolidayResponse,
    HolidaySummary,
    HolidayUpdateRequest,
)
from app.utils.holiday_storage import (
    coerce_holiday_type_for_db,
    pack_holiday_description,
    unpack_holiday_description,
)

_AUDIENCE_LABELS = {
    "ALL": "All",
    "STUDENT": "Students",
    "TEACHER": "Teachers",
    "ADMIN": "Admin",
}
# Keep aligned with typical `holidays.applicable_for` column size (e.g. NVARCHAR(150)).
_MAX_APPLICABLE_LEN = 150


def _integrity_hint(exc: IntegrityError) -> str:
    raw = str(getattr(exc, "orig", exc) or exc).strip()
    return raw[:900] if raw else ""


def _raise_holiday_integrity(exc: IntegrityError) -> None:
    hint = _integrity_hint(exc)
    db_err = hint.lower()

    if "2627" in db_err or "2601" in db_err or "duplicate" in db_err or "unique key" in db_err:
        msg = (
            "A holiday with this name or the same schedule already exists for this academic year. "
            "Change the name or dates, or edit the existing record."
        )
        raise ValidationException(f"{msg} ({hint})" if hint else msg) from exc

    if "515" in db_err or "cannot insert the value null" in db_err:
        raise ValidationException(
            "The database rejected the row because a required column is null. "
            "This often happens if the holidays table still has legacy NOT NULL columns (for example audience_type) "
            "that the app no longer fills. Align the table (nullable or default) or run the correct migration. "
            f"Detail: {hint}"
        ) from exc

    if "check constraint" in db_err:
        if "holiday_type" in db_err:
            raise ValidationException(
                "The database has a CHECK rule on holiday_type that only allows certain legacy values "
                "(typically PUBLIC_HOLIDAY, ACADEMIC_BREAK, NON_TEACHING_DAY). "
                "Your holiday type was rejected. Remove or replace that CHECK constraint on dbo.holidays "
                "to allow custom types, or pick an allowed value until the database is updated. "
                f"Detail: {hint}"
            ) from exc
        raise ValidationException(
            "The database rejected the row because of a CHECK constraint. "
            f"Detail: {hint}"
        ) from exc

    if "foreign key" in db_err or "referenced table" in db_err:
        raise ValidationException(
            "The database rejected a foreign-key relationship (for example academic_year_id or tenant_id). "
            "Confirm the academic year belongs to your tenant. "
            f"Detail: {hint}"
        ) from exc

    if "truncat" in db_err or "too long" in db_err or "length" in db_err or "8152" in db_err:
        raise ValidationException(
            "One of the fields is too long for the database. Shorten the holiday name or description. "
            f"Detail: {hint}"
        ) from exc

    raise ValidationException(f"Could not save holiday due to a database constraint. Detail: {hint}") from exc


def _find_integrity_error(exc: BaseException | None) -> IntegrityError | None:
    """Resolve wrapped IntegrityError (SQLAlchemy / pyodbc often nest it on __cause__ or .orig)."""
    visited: set[int] = set()

    def walk(e: BaseException | None) -> IntegrityError | None:
        if e is None:
            return None
        i = id(e)
        if i in visited:
            return None
        visited.add(i)
        if isinstance(e, IntegrityError):
            return e
        cause = getattr(e, "__cause__", None)
        if isinstance(cause, BaseException):
            got = walk(cause)
            if got is not None:
                return got
        ctx = getattr(e, "__context__", None)
        if isinstance(ctx, BaseException) and ctx is not cause:
            got = walk(ctx)
            if got is not None:
                return got
        if isinstance(e, SQLAlchemyError):
            orig = getattr(e, "orig", None)
            if isinstance(orig, BaseException):
                got = walk(orig)
                if got is not None:
                    return got
        return None

    return walk(exc)


def _commit_holiday(db: Session, row: Holiday) -> None:
    try:
        db.commit()
        db.refresh(row)
    except SQLAlchemyError as exc:
        db.rollback()
        integ = _find_integrity_error(exc)
        if integ is not None:
            _raise_holiday_integrity(integ)
        raise


def _validate_dates(start_date, end_date) -> None:
    if end_date and end_date < start_date:
        raise ValidationException("End date cannot be before start date")


def _get_academic_year_for_tenant(
    db: Session, tenant_id: int, academic_year_id: int
) -> AcademicYear:
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


def _ensure_academic_year(db: Session, tenant_id: int, academic_year_id: int) -> None:
    _get_academic_year_for_tenant(db, tenant_id, academic_year_id)


def _validate_holiday_dates_within_academic_year(
    ay: AcademicYear, start_date, end_date
) -> None:
    if start_date < ay.start_date or start_date > ay.end_date:
        raise ValidationException(
            "Holiday start date must fall within the selected academic year."
        )
    if end_date < ay.start_date or end_date > ay.end_date:
        raise ValidationException(
            "Holiday end date must fall within the selected academic year."
        )


def _assert_no_duplicate_holiday(
    db: Session,
    *,
    tenant_id: int,
    academic_year_id: int,
    holiday_name: str,
    start_date,
    exclude_holiday_id: int | None = None,
) -> None:
    """Avoid unique-constraint failures when the DB enforces one row per name/start/year/tenant."""
    q = (
        db.query(Holiday.id)
        .filter(
            Holiday.tenant_id == tenant_id,
            Holiday.academic_year_id == academic_year_id,
            Holiday.is_active == True,  # noqa: E712
            Holiday.holiday_name == holiday_name.strip(),
            Holiday.start_date == start_date,
        )
    )
    if exclude_holiday_id is not None:
        q = q.filter(Holiday.id != exclude_holiday_id)
    if q.first() is not None:
        raise ValidationException(
            "A holiday with this name and start date already exists for this academic year. "
            "Change the name or start date, or edit the existing holiday."
        )


def _format_holiday_date(start_date, end_date) -> str:
    if end_date and end_date != start_date:
        return f"{start_date.isoformat()} to {end_date.isoformat()}"
    return start_date.isoformat()


def _inclusive_day_span(start: date, end: date) -> int:
    return (end - start).days + 1


def _dedupe_preserve(ids: list[int]) -> list[int]:
    seen: set[int] = set()
    out: list[int] = []
    for i in ids:
        if i not in seen:
            seen.add(i)
            out.append(i)
    return out


def _normalize_scope(
    audience_type: str,
    class_ids: list[int] | None,
    division_ids: list[int] | None,
) -> tuple[list[int], list[int]]:
    c = _dedupe_preserve(list(class_ids or []))
    d = _dedupe_preserve(list(division_ids or []))
    if audience_type in ("TEACHER", "ADMIN"):
        return [], []
    return c, d


def _validate_audience_scope(audience_type: str, class_ids: list[int], division_ids: list[int]) -> None:
    if audience_type in ("STUDENT", "ALL"):
        if not class_ids and not division_ids:
            raise ValidationException("Select at least one class or division for the chosen audience.")


def _scope_detail_labels(db: Session, tenant_id: int, class_ids: list[int], division_ids: list[int]) -> list[str]:
    labels: list[str] = []
    div_class_ids: set[int] = set()
    if division_ids:
        rows = (
            db.query(ClassDivision.division_name, SchoolClass.id, SchoolClass.name)
            .join(SchoolClass, SchoolClass.id == ClassDivision.class_id)
            .filter(
                ClassDivision.id.in_(division_ids),
                SchoolClass.tenant_id == tenant_id,
                SchoolClass.is_deleted == False,  # noqa: E712
            )
            .all()
        )
        for dname, cid, cname in rows:
            div_class_ids.add(cid)
            labels.append(f"{cname} - {dname}")
    for cid in class_ids:
        if cid in div_class_ids:
            continue
        cls = (
            db.query(SchoolClass)
            .filter(
                SchoolClass.id == cid,
                SchoolClass.tenant_id == tenant_id,
                SchoolClass.is_deleted == False,  # noqa: E712
            )
            .first()
        )
        if cls:
            labels.append(cls.name)
    return labels


def _build_applicable_for_label(
    db: Session,
    tenant_id: int,
    audience_type: str,
    class_ids: list[int],
    division_ids: list[int],
) -> str:
    base = _AUDIENCE_LABELS.get(audience_type, audience_type)
    if audience_type not in ("STUDENT", "ALL"):
        return base[:_MAX_APPLICABLE_LEN]
    details = _scope_detail_labels(db, tenant_id, class_ids, division_ids)
    if not details:
        return base[:_MAX_APPLICABLE_LEN]
    body = f"{base} · {', '.join(details)}"
    if len(body) <= _MAX_APPLICABLE_LEN:
        return body
    return body[: _MAX_APPLICABLE_LEN - 1] + "…"


def _to_response(row: Holiday) -> HolidayResponse:
    return HolidayResponse.from_holiday_row(row)


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
        ht = holiday_type.strip()
        ht_u = ht.upper()
        if ht_u in ("PUBLIC_HOLIDAY", "ACADEMIC_BREAK", "NON_TEACHING_DAY"):
            base_query = base_query.filter(Holiday.holiday_type == ht_u)
        else:
            frag = f'"holiday_type_label":{json.dumps(ht[:50])}'
            base_query = base_query.filter(Holiday.description.contains(frag))

    if search:
        search_text = f"%{search.strip()}%"
        base_query = base_query.filter(
            or_(
                Holiday.holiday_name.ilike(search_text),
                Holiday.applicable_for.ilike(search_text),
                Holiday.holiday_type.ilike(search_text),
                Holiday.description.ilike(search_text),
            )
        )

    total = base_query.count()

    summary_rows = (
        base_query.with_entities(Holiday.holiday_type, func.count(Holiday.id))
        .group_by(Holiday.holiday_type)
        .all()
    )
    summary_map = {row[0]: int(row[1]) for row in summary_rows}
    pub = summary_map.get("PUBLIC_HOLIDAY", 0)
    acad = summary_map.get("ACADEMIC_BREAK", 0)
    nont = summary_map.get("NON_TEACHING_DAY", 0)
    typed_sum = pub + acad + nont
    other = max(0, total - typed_sum)

    rows = (
        base_query.order_by(Holiday.created_at.desc(), Holiday.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    data: list[HolidayListItem] = []
    for row in rows:
        end_d = row.end_date or row.start_date
        span = _inclusive_day_span(row.start_date, end_d)
        _, _, _, _, list_htype_label = unpack_holiday_description(row.description)
        display_htype = list_htype_label or row.holiday_type
        data.append(
            HolidayListItem(
                id=row.id,
                holiday_name=row.holiday_name,
                holiday_date=_format_holiday_date(row.start_date, row.end_date),
                holiday_type=display_htype,
                applicable_for=row.applicable_for,
                total_days=span,
            )
        )

    return HolidayListResponse(
        summary=HolidaySummary(
            total_holidays=total,
            public_holidays=pub,
            academic_breaks=acad,
            non_teaching=nont,
            other_holidays=other,
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
    ay = _get_academic_year_for_tenant(db, tenant_id, payload.academic_year_id)

    end_date = payload.end_date or payload.start_date
    _validate_dates(payload.start_date, end_date)
    _validate_holiday_dates_within_academic_year(ay, payload.start_date, end_date)

    aud = payload.audience_type.strip().upper()
    c_ids, d_ids = _normalize_scope(aud, payload.class_ids, payload.division_ids)
    _validate_audience_scope(aud, c_ids, d_ids)

    applicable_for = _build_applicable_for_label(db, tenant_id, aud, c_ids, d_ids)
    db_htype, htype_label = coerce_holiday_type_for_db(payload.holiday_type)
    desc_stored = pack_holiday_description(
        aud, c_ids, d_ids, payload.description, holiday_type_label=htype_label
    )

    hname = payload.holiday_name.strip()
    _assert_no_duplicate_holiday(
        db,
        tenant_id=tenant_id,
        academic_year_id=payload.academic_year_id,
        holiday_name=hname,
        start_date=payload.start_date,
    )

    row = Holiday(
        tenant_id=tenant_id,
        academic_year_id=payload.academic_year_id,
        holiday_name=hname,
        holiday_type=db_htype,
        start_date=payload.start_date,
        end_date=end_date,
        applicable_for=applicable_for,
        description=desc_stored,
        is_active=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(row)
    _commit_holiday(db, row)
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
    ay = _get_academic_year_for_tenant(db, tenant_id, next_academic_year_id)
    _validate_holiday_dates_within_academic_year(ay, next_start_date, next_end_date)

    row.academic_year_id = next_academic_year_id
    row.holiday_name = (
        update_data["holiday_name"].strip()
        if "holiday_name" in update_data and update_data["holiday_name"] is not None
        else row.holiday_name
    )
    stored_aud, prev_c, prev_d, user_notes, prev_htype_label = unpack_holiday_description(row.description)

    if "holiday_type" in update_data and update_data["holiday_type"] is not None:
        db_htype, new_htype_label = coerce_holiday_type_for_db(update_data["holiday_type"])
        row.holiday_type = db_htype
        pack_htype_label = new_htype_label
    else:
        pack_htype_label = prev_htype_label

    row.start_date = next_start_date
    row.end_date = next_end_date

    if "audience_type" in update_data and update_data["audience_type"] is not None:
        aud = update_data["audience_type"].strip().upper()
    else:
        aud = (stored_aud or "TEACHER").strip().upper()

    if "class_ids" in update_data:
        c_ids = update_data["class_ids"] or []
    else:
        c_ids = prev_c
    if "division_ids" in update_data:
        d_ids = update_data["division_ids"] or []
    else:
        d_ids = prev_d

    if "description" in update_data:
        if update_data["description"] is None:
            user_notes = ""
        else:
            user_notes = str(update_data["description"]).strip()

    c_ids, d_ids = _normalize_scope(aud, c_ids, d_ids)
    _validate_audience_scope(aud, c_ids, d_ids)
    row.applicable_for = _build_applicable_for_label(db, tenant_id, aud, c_ids, d_ids)
    row.description = pack_holiday_description(
        aud, c_ids, d_ids, user_notes if user_notes else None, holiday_type_label=pack_htype_label
    )
    if "is_active" in update_data and update_data["is_active"] is not None:
        row.is_active = update_data["is_active"]
    row.updated_at = datetime.utcnow()

    _assert_no_duplicate_holiday(
        db,
        tenant_id=tenant_id,
        academic_year_id=row.academic_year_id,
        holiday_name=row.holiday_name,
        start_date=row.start_date,
        exclude_holiday_id=holiday_id,
    )

    _commit_holiday(db, row)
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
