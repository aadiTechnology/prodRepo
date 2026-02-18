from typing import Optional
from pydantic import BaseModel, EmailStr


class ProfileResponse(BaseModel):
    full_name: str
    email: EmailStr
    role: str
    is_active: bool
    profile_image_path: Optional[str] = None

    class Config:
        from_attributes = True


class ProfileUpdate(BaseModel):
    full_name: str
