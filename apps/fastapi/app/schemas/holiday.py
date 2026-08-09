from __future__ import annotations

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.utils.holiday_storage import unpack_holiday_description

_AUDIENCE_TYPES = frozenset({"ALL", "STUDENT", "TEACHER", "ADMIN"})


class HolidayBase(BaseModel):
    holiday_name: str = Field(..., min_length=1, max_length=150)
    holiday_type: str = Field(..., min_length=1, max_length=50)
    start_date: date
    end_date: date | None = None
    audience_type: str = Field(..., min_length=1, max_length=30)
    class_ids: list[int] = Field(default_factory=list)
    division_ids: list[int] = Field(default_factory=list)
    description: str | None = None

    @field_validator("audience_type")
    @classmethod
    def audience_must_be_known(cls, v: str) -> str:
        u = v.strip().upper()
        if u not in _AUDIENCE_TYPES:
            raise ValueError("audience_type must be one of ALL, STUDENT, TEACHER, ADMIN")
        return u


class HolidayCreateRequest(HolidayBase):
    academic_year_id: int = Field(..., ge=1)


class HolidayUpdateRequest(BaseModel):
    academic_year_id: int | None = Field(None, ge=1)
    holiday_name: str | None = Field(None, min_length=1, max_length=150)
    holiday_type: str | None = Field(None, min_length=1, max_length=50)
    start_date: date | None = None
    end_date: date | None = None
    audience_type: str | None = Field(None, min_length=1, max_length=30)
    class_ids: list[int] | None = None
    division_ids: list[int] | None = None
    description: str | None = None
    is_active: bool | None = None

    @field_validator("audience_type")
    @classmethod
    def audience_optional_known(cls, v: str | None) -> str | None:
        if v is None:
            return None
        u = v.strip().upper()
        if u not in _AUDIENCE_TYPES:
            raise ValueError("audience_type must be one of ALL, STUDENT, TEACHER, ADMIN")
        return u


class HolidayResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tenant_id: int
    academic_year_id: int
    holiday_name: str
    holiday_type: str
    start_date: date
    end_date: date | None = None
    applicable_for: str
    audience_type: str | None = None
    class_ids: list[int] = Field(default_factory=list)
    division_ids: list[int] = Field(default_factory=list)
    description: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime | None = None

    @classmethod
    def from_holiday_row(cls, row: Any) -> HolidayResponse:
        aud, cids, dids, public_desc, htype_label, _ = unpack_holiday_description(
            getattr(row, "description", None)
        )
        display_type = htype_label if htype_label else row.holiday_type
        return cls(
            id=row.id,
            tenant_id=row.tenant_id,
            academic_year_id=row.academic_year_id,
            holiday_name=row.holiday_name,
            holiday_type=display_type,
            start_date=row.start_date,
            end_date=row.end_date,
            applicable_for=row.applicable_for,
            audience_type=aud,
            class_ids=cids,
            division_ids=dids,
            description=public_desc or None,
            is_active=row.is_active,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )


class HolidayListItem(BaseModel):
    id: int
    holiday_name: str
    holiday_date: str
    holiday_type: str
    applicable_for: str
    total_days: int


class HolidaySummary(BaseModel):
    total_holidays: int
    public_holidays: int
    academic_breaks: int
    non_teaching: int
    other_holidays: int


class HolidayListResponse(BaseModel):
    summary: HolidaySummary
    data: list[HolidayListItem]
    total: int
