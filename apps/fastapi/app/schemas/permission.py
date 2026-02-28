from pydantic import BaseModel
from typing import Optional

class PermissionResponse(BaseModel):
    id: int
    code: str
    name: str
    module_name: str
    is_active: bool

    class Config:
        from_attributes = True