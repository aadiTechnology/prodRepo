from typing import List, Optional
from pydantic import BaseModel, Field, field_validator

class PermissionMatrixRow(BaseModel):
    menu_id: int
    menu_name: str
    parent_id: Optional[int] = None
    level: int
    can_view: bool = False
    can_create: bool = False
    can_edit: bool = False
    can_delete: bool = False

class RolePermissionMatrixResponse(BaseModel):
    role_id: int
    role_name: str
    items: List[PermissionMatrixRow]

class PermissionItemUpdate(BaseModel):
    menu_id: int = Field(..., gt=0, description="Menu ID must be a positive integer")
    can_view: bool
    can_create: bool
    can_edit: bool
    can_delete: bool

class PermissionBulkUpdateRequest(BaseModel):
    permissions: List[PermissionItemUpdate] = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="Permissions list must contain between 1 and 1000 items"
    )
    
    @field_validator('permissions')
    @classmethod
    def check_unique_menu_ids(cls, v: List[PermissionItemUpdate]) -> List[PermissionItemUpdate]:
        menu_ids = [p.menu_id for p in v]
        if len(menu_ids) != len(set(menu_ids)):
            raise ValueError("Duplicate menu_id values are not allowed")
        return v
