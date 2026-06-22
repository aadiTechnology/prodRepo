"""
School Class Schema - Validation Models for School Classes
Defines Pydantic models for SchoolClass entity with full audit trail
Includes create, update, and response models for API operations
"""

from pydantic import BaseModel, Field, model_validator
from typing import Any, Optional
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


class DivisionCreateNested(BaseModel):
    division_name: str = Field(min_length=1, max_length=100)
    capacity: Optional[int] = Field(None, ge=1, le=1000)
    is_active: bool = True


class SchoolClassCreate(SchoolClassBase):
    academic_year_id: int = Field(ge=1)
    divisions: Optional[list[DivisionCreateNested]] = Field(
        None, description="Divisions with name and capacity"
    )

    @model_validator(mode="before")
    @classmethod
    def normalize_divisions(cls, data: Any) -> Any:
        """Accept legacy string division names or nested division objects."""
        if not isinstance(data, dict):
            return data
        raw_divisions = data.get("divisions")
        if not raw_divisions:
            return data
        normalized: list[dict[str, Any]] = []
        for item in raw_divisions:
            if isinstance(item, str):
                name = item.strip()
                if name:
                    normalized.append(
                        {
                            "division_name": name,
                            "capacity": data.get("capacity"),
                            "is_active": data.get("is_active", True),
                        }
                    )
            elif isinstance(item, dict):
                normalized.append(item)
            else:
                normalized.append(item)
        return {**data, "divisions": normalized}


class DivisionUpdateNested(BaseModel):
    id: Optional[int] = Field(None, ge=1)
    division_name: str = Field(min_length=1, max_length=100)
    capacity: Optional[int] = Field(None, ge=1, le=1000)
    is_active: bool = True


class SchoolClassUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    section: Optional[str] = Field(None, min_length=1, max_length=50)
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = Field(None, max_length=500)
    capacity: Optional[int] = Field(None, ge=1, le=1000)
    academic_year_id: Optional[int] = Field(None, ge=1)
    is_active: Optional[bool] = None
    divisions: Optional[list[DivisionUpdateNested]] = Field(None)


class ClassDivisionResponse(BaseModel):
    id: int
    class_id: int
    division_name: str
    capacity: Optional[int] = None
    is_active: bool
    student_count: int = 0

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
