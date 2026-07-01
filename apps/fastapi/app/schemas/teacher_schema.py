from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator

from app.core.date_validators import validate_not_future_date
from app.core.contact_validators import validate_contact_number

class TeacherAssignmentDivision(BaseModel):
    id: int
    division_name: str


class TeacherAssignmentRow(BaseModel):
    class_id: Optional[int] = None
    class_name: Optional[str] = None
    division_names: list[str] = []
    divisions: list[TeacherAssignmentDivision] = []

# Base properties
class TeacherBase(BaseModel):
    full_name: str
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    mobile_number: str
    email: Optional[EmailStr] = None
    qualification: Optional[str] = None
    experience_years: Optional[int] = None
    photo_url: Optional[str] = None
    class_id: Optional[int] = None
    class_division_id: Optional[int] = None
    is_active: bool = True
    
    # Address Details
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None

    @field_validator("mobile_number")
    @classmethod
    def validate_mobile_number(cls, value: str) -> str:
        return validate_contact_number(value, required=True)

# Properties to receive on creation
class TeacherCreate(TeacherBase):
    @field_validator("date_of_birth")
    @classmethod
    def validate_date_of_birth(cls, value: Optional[date]) -> Optional[date]:
        return validate_not_future_date(value)

    @field_validator("pincode")
    @classmethod
    def validate_pincode(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        normalized = value.strip()
        if normalized == "":
            return None
        if not normalized.isdigit() or len(normalized) != 6:
            raise ValueError("Pincode must be a 6-digit number")
        return normalized

    pass

# Properties to receive on update
class TeacherUpdate(BaseModel):
    full_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    mobile_number: Optional[str] = None
    email: Optional[EmailStr] = None
    qualification: Optional[str] = None
    experience_years: Optional[int] = None
    photo_url: Optional[str] = None
    class_id: Optional[int] = None
    class_division_id: Optional[int] = None
    is_active: Optional[bool] = None
    
    # Address Details
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None

    @field_validator("date_of_birth")
    @classmethod
    def validate_date_of_birth(cls, value: Optional[date]) -> Optional[date]:
        return validate_not_future_date(value)

    @field_validator("mobile_number")
    @classmethod
    def validate_mobile_number(cls, value: Optional[str]) -> Optional[str]:
        return validate_contact_number(value, required=False)

    @field_validator("pincode")
    @classmethod
    def validate_pincode(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        normalized = value.strip()
        if normalized == "":
            return None
        if not normalized.isdigit() or len(normalized) != 6:
            raise ValueError("Pincode must be a 6-digit number")
        return normalized

# Properties to return to client
class TeacherResponse(TeacherBase):
    id: int
    tenant_id: int
    teacher_code: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    # Linked user account id — used by frontend to match teacher to logged-in user
    user_id: Optional[int] = None

    # Extended properties
    class_name: Optional[str] = None
    division_name: Optional[str] = None
    assignment_rows: list[TeacherAssignmentRow] = []

    class Config:
        from_attributes = True

# Pagination wrapper
class TeacherListResponse(BaseModel):
    items: list[TeacherResponse]
    total: int
