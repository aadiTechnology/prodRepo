from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, EmailStr

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

# Properties to receive on creation
class TeacherCreate(TeacherBase):
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

# Properties to return to client
class TeacherResponse(TeacherBase):
    id: int
    tenant_id: int
    teacher_code: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Extended properties
    class_name: Optional[str] = None
    division_name: Optional[str] = None

    class Config:
        from_attributes = True

# Pagination wrapper
class TeacherListResponse(BaseModel):
    items: list[TeacherResponse]
    total: int
