"""Pydantic schemas for Menu and hierarchical navigation."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class MenuBase(BaseModel):
    name: str
    path: Optional[str] = None
    icon: Optional[str] = None
    sort_order: int = 0
    level: int
    parent_id: Optional[int] = None
    tenant_id: Optional[int] = None
    is_active: bool = True


class MenuCreate(MenuBase):
    """Schema for creating a menu."""

    pass


class MenuUpdate(BaseModel):
    """Schema for updating a menu."""

    name: Optional[str] = None
    path: Optional[str] = None
    icon: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class MenuResponse(MenuBase):
    """Menu record returned to clients."""

    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class MenuNode(BaseModel):
    """Hierarchical node used for navigation."""

    id: int
    name: str
    path: Optional[str] = None
    icon: Optional[str] = None
    children: List["MenuNode"] = []

    class Config:
        orm_mode = True

