from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

HolidayType = Literal["PUBLIC_HOLIDAY", "ACADEMIC_BREAK", "NON_TEACHING_DAY"]


class HolidayBase(BaseModel):
    holiday_name: str = Field(..., min_length=1, max_length=150)
    holiday_type: HolidayType
    start_date: date
    end_date: date | None = None
    applicable_for: str = Field(..., min_length=1, max_length=150)
    description: str | None = None


class HolidayCreateRequest(HolidayBase):
    academic_year_id: int = Field(..., ge=1)


class HolidayUpdateRequest(BaseModel):
    academic_year_id: int | None = Field(None, ge=1)
    holiday_name: str | None = Field(None, min_length=1, max_length=150)
    holiday_type: HolidayType | None = None
    start_date: date | None = None
    end_date: date | None = None
    applicable_for: str | None = Field(None, min_length=1, max_length=150)
    description: str | None = None
    is_active: bool | None = None


class HolidayResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tenant_id: int
    academic_year_id: int
    holiday_name: str
    holiday_type: HolidayType
    start_date: date
    end_date: date | None = None
    applicable_for: str
    description: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime | None = None


class HolidayListItem(BaseModel):
    id: int
    holiday_name: str
    holiday_date: str
    holiday_type: HolidayType
    applicable_for: str


class HolidaySummary(BaseModel):
    total_holidays: int
    public_holidays: int
    academic_breaks: int
    non_teaching: int


class HolidayListResponse(BaseModel):
    summary: HolidaySummary
    data: list[HolidayListItem]
    total: int
