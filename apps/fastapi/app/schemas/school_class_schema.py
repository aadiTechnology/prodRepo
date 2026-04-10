"""
School Class Schema - Validation Models for School Classes
Defines Pydantic models for SchoolClass entity with full audit trail
Includes create, update, and response models for API operations
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

# ═══════════════════════════════════════════════════════════════════════════
# School Class Models - Request/Response validation
# ═══════════════════════════════════════════════════════════════════════════
class SchoolClassBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    section: Optional[str] = Field(None, min_length=1, max_length=50)
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = Field(None, max_length=500)
    capacity: Optional[int] = Field(None, ge=1, le=1000)
    academic_year_id: Optional[int] = Field(None, ge=1)
    is_active: bool = True


class SchoolClassCreate(SchoolClassBase):
    academic_year_id: int = Field(ge=1)


class SchoolClassUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    section: Optional[str] = Field(None, min_length=1, max_length=50)
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = Field(None, max_length=500)
    capacity: Optional[int] = Field(None, ge=1, le=1000)
    academic_year_id: Optional[int] = Field(None, ge=1)
    is_active: Optional[bool] = None


class ClassDivisionResponse(BaseModel):
    id: int
    class_id: int
    division_name: str
    capacity: Optional[int] = None
    is_active: bool

    class Config:
        from_attributes = True


class SchoolClassResponse(SchoolClassBase):
    id: int
    tenant_id: int
    academic_year_name: Optional[str] = None
    divisions: list[ClassDivisionResponse] = []
    created_at: Optional[datetime] = None
    created_by: Optional[int] = None
    updated_at: Optional[datetime] = None
    updated_by: Optional[int] = None
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None
    deleted_by: Optional[int] = None

    class Config:
        from_attributes = True
