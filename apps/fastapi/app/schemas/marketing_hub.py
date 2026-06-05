from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator


def _validate_url(value: str) -> str:
    cleaned = value.strip()
    lowered = cleaned.lower()
    if not (lowered.startswith("http://") or lowered.startswith("https://")):
        raise ValueError("url must start with http:// or https://")
    return cleaned


class MarketingPlatformBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    code: str = Field(..., min_length=1, max_length=50)
    category: str = Field(..., min_length=1, max_length=50)
    description: str | None = Field(None, max_length=200)
    icon_url: str | None = Field(None, max_length=500)
    sort_order: int = 0
    is_active: bool = True


class MarketingPlatformCreate(MarketingPlatformBase):
    pass


class MarketingPlatformUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    code: str | None = Field(None, min_length=1, max_length=50)
    category: str | None = Field(None, min_length=1, max_length=50)
    description: str | None = Field(None, max_length=200)
    icon_url: str | None = Field(None, max_length=500)
    sort_order: int | None = None
    is_active: bool | None = None


class MarketingPlatformResponse(MarketingPlatformBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime | None = None


class MarketingSocialMediaLinkBase(BaseModel):
    scope_type: str = Field("TENANT", max_length=20)
    platform_id: int
    url: str = Field(..., min_length=5, max_length=2000)
    is_active: bool = True

    @field_validator("url")
    @classmethod
    def url_must_be_valid(cls, value: str) -> str:
        return _validate_url(value)


class MarketingSocialMediaLinkCreate(MarketingSocialMediaLinkBase):
    tenant_id: int | None = None


class MarketingSocialMediaLinkUpdate(BaseModel):
    url: str | None = Field(None, min_length=5, max_length=2000)
    is_active: bool | None = None

    @field_validator("url")
    @classmethod
    def optional_url_must_be_valid(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return _validate_url(value)


class MarketingSocialMediaLinkResponse(MarketingSocialMediaLinkBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tenant_id: int | None
    created_at: datetime
    updated_at: datetime | None = None


class MarketingHubConfigResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    platform_id: int
    name: str
    code: str
    category: str
    description: str | None = None
    icon_url: str | None = None
    sort_order: int
    is_active: bool  # Catalog active state

    # Tenant specific link configuration (None if not set yet for this tenant)
    link_id: int | None = None
    url: str | None = None
    link_active: bool | None = None
