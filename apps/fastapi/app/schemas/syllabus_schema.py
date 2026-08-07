from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

SyllabusMonth = Literal[
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
]

SYLLABUS_MONTHS: tuple[str, ...] = (
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
)


class SyllabusAttachmentResponse(BaseModel):
    id: int
    file_name: str
    file_path: str
    file_type: str | None = None
    file_size_kb: int | None = None
    uploaded_at: datetime | None = None


class SyllabusCreateRequest(BaseModel):
    academic_year_id: int = Field(..., ge=1)
    class_id: int = Field(..., ge=1)
    month: SyllabusMonth


class SyllabusUpdateRequest(BaseModel):
    academic_year_id: int = Field(..., ge=1)
    class_id: int = Field(..., ge=1)
    month: SyllabusMonth


class SyllabusResponse(BaseModel):
    id: int
    academic_year_id: int
    academic_year_name: str
    class_id: int
    class_name: str
    month: SyllabusMonth
    uploaded_by_name: str
    upload_date: datetime
    attachment: SyllabusAttachmentResponse | None = None


class SyllabusListResponse(BaseModel):
    items: list[SyllabusResponse]
    total: int
    page: int
    size: int


class AcademicYearOption(BaseModel):
    id: int
    name: str
    is_current: bool = False


class ClassOption(BaseModel):
    id: int
    name: str


class SyllabusFilterOptionsResponse(BaseModel):
    academic_years: list[AcademicYearOption]
    classes: list[ClassOption]
    months: list[str]
