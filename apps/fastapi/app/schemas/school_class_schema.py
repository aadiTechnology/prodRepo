from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class SchoolClassBase(BaseModel):
    academic_year_id: int
    name: str = Field(min_length=2, max_length=100)
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = Field(None, max_length=500)
    section: Optional[str] = Field(None, max_length=50)
    capacity: Optional[int] = Field(None, ge=1, le=1000)
    is_active: bool = True


class SchoolClassCreate(SchoolClassBase):
    pass


class SchoolClassUpdate(BaseModel):
    academic_year_id: Optional[int] = None
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = Field(None, max_length=500)
    section: Optional[str] = Field(None, max_length=50)
    capacity: Optional[int] = Field(None, ge=1, le=1000)
    is_active: Optional[bool] = None


class SchoolClassResponse(SchoolClassBase):
    id: int
    tenant_id: int
    created_at: Optional[datetime] = None
    created_by: Optional[int] = None
    updated_at: Optional[datetime] = None
    updated_by: Optional[int] = None
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None
    deleted_by: Optional[int] = None

    class Config:
        from_attributes = True
