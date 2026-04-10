"""
Division Schema - Validation Models for Class Divisions
Defines Pydantic models for ClassDivision entity
Includes create, update, and response models
"""

from pydantic import BaseModel, Field
from typing import Optional

class DivisionBase(BaseModel):
    division_name: str = Field(..., min_length=1, max_length=50)
    capacity: Optional[int] = Field(None, ge=1, le=1000)
    is_active: bool = True

class DivisionCreate(DivisionBase):
    class_id: int

class DivisionUpdate(BaseModel):
    division_name: Optional[str] = Field(None, min_length=1, max_length=50)
    capacity: Optional[int] = Field(None, ge=1, le=1000)
    is_active: Optional[bool] = None

class DivisionResponse(DivisionBase):
    id: int
    class_id: int

    class Config:
        from_attributes = True
