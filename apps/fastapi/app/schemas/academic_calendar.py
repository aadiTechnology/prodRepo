from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class HolidayRowStatus(StrEnum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


class AcademicCalendarStatus(StrEnum):
    ACTIVE = "ACTIVE"
    CLOSED = "CLOSED"


class AcademicCalendarDayItem(BaseModel):
    model_config = ConfigDict(from_attributes=False)

    date: str = Field(..., description="ISO date YYYY-MM-DD")
    day: int = Field(..., ge=1, le=31)
    holiday_name: str
    holiday_type: str
    status: HolidayRowStatus
    outside_academic_year: bool


class AcademicCalendarResponse(BaseModel):
    month: str
    year: int
    academic_status: AcademicCalendarStatus
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=31, ge=1, le=100)
    total: int = Field(default=0, ge=0)
    data: list[AcademicCalendarDayItem]
