from datetime import date
from typing import Any, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.core.contact_validators import validate_contact_number
from app.core.date_validators import validate_not_future_date

class NextAdmissionNoResponse(BaseModel):
    admission_no: str


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
    class_division_id: Optional[int] = None
    fee_structure_id: Optional[int] = None
    discount_id: Optional[int] = None
    expected_admission_date: Optional[date] = None
    birth_certificate_url: Optional[str] = None
    photo_url: Optional[str] = None


class EnrollmentCreateRequest(BaseModel):
    lead_id: Optional[int] = Field(default=None, description="Optional lead id to convert")

    student_name: str
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None

    admission_no: Optional[str] = None
    admission_date: date
    academic_year_id: int

    class_id: int
    class_division_id: Optional[int] = None
    roll_no: Optional[str] = None

    parent_name: str
    mobile_number: str
    email: EmailStr

    fee_structure_id: int
    discount_id: Optional[int] = None
    additional_fee: Optional[float] = None

    birth_certificate_url: Optional[str] = None
    photo_url: Optional[str] = None

    @field_validator("date_of_birth")
    @classmethod
    def validate_date_of_birth(cls, value: Optional[date]) -> Optional[date]:
        return validate_not_future_date(value)

    @field_validator("mobile_number")
    @classmethod
    def validate_mobile_number(cls, value: str) -> str:
        return validate_contact_number(value, required=True)

class EnrollmentCreateResponse(BaseModel):
    message: str
    student_id: int
    admission_no: str
    fee_assignment: dict[str, Any]
    printable: dict[str, Any]
