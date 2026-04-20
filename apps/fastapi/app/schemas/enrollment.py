from datetime import date
from typing import Any, Optional

from pydantic import BaseModel, Field


class EnrollmentPrefillResponse(BaseModel):
    lead_id: int
    student_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    parent_name: Optional[str] = None
    mobile_number: Optional[str] = None
    email: Optional[str] = None
    academic_year_id: Optional[int] = None
    class_id: Optional[int] = None
    expected_admission_date: Optional[date] = None


class EnrollmentCreateRequest(BaseModel):
    lead_id: Optional[int] = Field(default=None, description="Optional lead id to convert")

    student_name: str
    date_of_birth: date
    gender: Optional[str] = None

    admission_no: Optional[str] = None
    admission_date: date
    academic_year_id: int

    class_id: int
    class_division_id: Optional[int] = None
    roll_no: Optional[str] = None

    parent_name: str
    mobile_number: str
    email: Optional[str] = None

    fee_structure_id: int
    discount_id: Optional[int] = None
    additional_fee: Optional[float] = None

    birth_certificate_url: Optional[str] = None
    photo_url: Optional[str] = None


class EnrollmentCreateResponse(BaseModel):
    message: str
    student_id: int
    admission_no: str
    fee_assignment: dict[str, Any]
    printable: dict[str, Any]
