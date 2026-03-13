
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class FeeCategoryResponse(BaseModel):
    id: str
    tenant_id: int
    name: str
    code: str
    description: Optional[str]
    status: bool
    created_at: Optional[datetime]
    created_by: Optional[int]
    updated_at: Optional[datetime]
    updated_by: Optional[int]
    deleted_at: Optional[datetime]
    deleted_by: Optional[int]

    class Config:
        orm_mode = True