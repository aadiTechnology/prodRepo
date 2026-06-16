from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class ProfileResponse(BaseModel):
    full_name: str
    email: str  # str not EmailStr — student accounts use @student.local
    role: str
    is_active: bool
    profile_image_path: Optional[str] = None
    phone_number: Optional[str] = None
    created_at: Optional[datetime] = None
    tenant_name: Optional[str] = None

    class Config:
        from_attributes = True


class ProfileUpdate(BaseModel):
    full_name: str
