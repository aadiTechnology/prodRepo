"""
Academic Schemas - Validation Models for Academic System
Defines Pydantic models for AcademicYear and Class entities
Used for request/response serialization in FastAPI endpoints
"""

from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, constr, Field
from app.schemas.school_class_schema import ClassDivisionResponse

from app.schemas.school_class_schema import (
    SchoolClassBase as ClassBase,
    SchoolClassCreate as ClassCreate,
    SchoolClassUpdate as ClassUpdate,
    SchoolClassResponse as ClassResponse,
    ClassDivisionResponse
)

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

# Class models are now imported from school_class_schema.py above
