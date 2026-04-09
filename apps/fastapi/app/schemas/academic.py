"""
Academic Schemas - Validation Models for Academic System
Defines Pydantic models for AcademicYear and Class entities
Used for request/response serialization in FastAPI endpoints
"""

from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, constr, Field
from app.schemas.school_class_schema import ClassDivisionResponse

# ═══════════════════════════════════════════════════════════════════════════
# Academic Year Models
# ═══════════════════════════════════════════════════════════════════════════
class AcademicYearBase(BaseModel):
    name: constr(max_length=50)
    code: constr(max_length=20)
    start_date: date
    end_date: date
    is_current: bool = False
    is_active: bool = True

class AcademicYearCreate(AcademicYearBase):
    pass

class AcademicYearUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_current: Optional[bool] = None
    is_active: Optional[bool] = None

class AcademicYearResponse(AcademicYearBase):
    id: int
    tenant_id: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

class ClassBase(BaseModel):
    academic_year_id: int
    name: str = Field(min_length=2, max_length=100)
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = Field(None, max_length=500)
    section: Optional[str] = Field(None, max_length=50)
    capacity: Optional[int] = Field(None, ge=1, le=1000)
    is_active: bool = True

class ClassCreate(ClassBase):
    pass

class ClassUpdate(BaseModel):
    academic_year_id: Optional[int] = None
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    section: Optional[str] = None
    capacity: Optional[int] = None
    is_active: Optional[bool] = None

class ClassResponse(ClassBase):
    id: int
    tenant_id: int
    divisions: list[ClassDivisionResponse] = []
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
