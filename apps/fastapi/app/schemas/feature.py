"""Pydantic schemas for Feature (permission)."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class FeatureBase(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    is_active: bool = True


class FeatureCreate(FeatureBase):
    """Schema for creating a new feature."""

    pass


class FeatureUpdate(BaseModel):
    """Schema for updating an existing feature."""

    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None


class FeatureResponse(FeatureBase):
    """Feature data returned to clients."""

    id: int
    created_at: datetime

    class Config:
        from_attributes = True

