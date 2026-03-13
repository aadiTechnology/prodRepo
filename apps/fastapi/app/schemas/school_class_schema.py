
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SchoolClassResponse(BaseModel):
    id: int
    tenant_id: int
    academic_year_id: int
    name: str
    code: str
    description: Optional[str]
    section: Optional[str]
    capacity: Optional[int]
    is_active: bool
    created_at: Optional[datetime]
    created_by: Optional[int]
    updated_at: Optional[datetime]
    updated_by: Optional[int]
    is_deleted: bool
    deleted_at: Optional[datetime]
    deleted_by: Optional[int]

    class Config:
        orm_mode = True