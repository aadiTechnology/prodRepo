from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


def _validate_video_url(value: str) -> str:
    cleaned = value.strip()
    lowered = cleaned.lower()
    if not (lowered.startswith("http://") or lowered.startswith("https://")):
        raise ValueError("video_url must start with http:// or https://")
    return cleaned


class DemoVideoBase(BaseModel):
    module_key: str = Field(..., min_length=1, max_length=120)
    module_name: str = Field(..., min_length=1, max_length=200)
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    video_url: str = Field(..., min_length=5, max_length=1000)
    is_active: bool = True

    @field_validator("video_url")
    @classmethod
    def video_url_must_be_http(cls, value: str) -> str:
        return _validate_video_url(value)


class DemoVideoCreate(DemoVideoBase):
    pass


class DemoVideoUpdate(BaseModel):
    module_key: str | None = Field(None, min_length=1, max_length=120)
    module_name: str | None = Field(None, min_length=1, max_length=200)
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    video_url: str | None = Field(None, min_length=5, max_length=1000)
    is_active: bool | None = None

    @field_validator("video_url")
    @classmethod
    def optional_video_url_must_be_http(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return _validate_video_url(value)


class DemoVideoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    module_key: str
    module_name: str
    title: str
    description: str | None
    video_url: str
    is_active: bool
    created_at: datetime
    updated_at: datetime | None = None
