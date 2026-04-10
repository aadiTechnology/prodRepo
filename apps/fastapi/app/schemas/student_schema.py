from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List, Dict, Any

class StudentListItem(BaseModel):
    id: str
    name: str
    gender: Optional[str]
    mobile: Optional[str]
    class_: str = Field(..., alias="class")

    model_config = {
        "populate_by_name": True,
        "from_attributes": True,
    }
    status: str


class Pagination(BaseModel):
    page: int
    limit: int
    total: int

class StudentListResponse(BaseModel):
    data: List[StudentListItem]
    pagination: Pagination

class StudentUpdateRequest(BaseModel):
    student_name: Optional[str]
    gender: Optional[str]
    mobile_number: Optional[str]
    email: Optional[EmailStr]
    parent_name: Optional[str]
    class_id: Optional[int]
    roll_no: Optional[str]
    date_of_birth: Optional[str]
    admission_no: Optional[str]
    academic_year_id: Optional[int]
    is_active: Optional[bool]
