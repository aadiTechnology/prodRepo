"""Pydantic schemas for Theme Template (token override templates)."""

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class ThemeTemplateBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    config: dict[str, Any] = Field(..., description="Token overrides (partial Tokens JSON)")


class ThemeTemplateCreate(ThemeTemplateBase):
    """Schema for creating a new theme template."""
    pass


class ThemeTemplateUpdate(BaseModel):
    """Schema for updating an existing theme template."""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    config: Optional[dict[str, Any]] = None


class ThemeTemplateResponse(ThemeTemplateBase):
    """Theme template as returned to clients."""

    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ThemeTemplateListResponse(BaseModel):
    items: list[ThemeTemplateResponse]
    total: int
