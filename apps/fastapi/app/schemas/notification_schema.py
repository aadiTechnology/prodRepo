"""Pydantic schemas for in-app notifications and module settings."""

from __future__ import annotations

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

NotificationModule = Literal["syllabus", "holiday", "notice", "exam", "general"]
NotificationKind = Literal["reminder", "day", "general"]


class NotificationCreateRequest(BaseModel):
    """
    Standard notification create payload — only From / To / Subject / Body.
    JSON keys: from, to, subject, body.
    """

    model_config = ConfigDict(populate_by_name=True)

    from_: str = Field(
        ...,
        alias="from",
        min_length=1,
        max_length=255,
        description="Sender identifier (name, email, or system label).",
    )
    to: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="Target audience (e.g. ALL, TEACHER, STUDENT, ADMIN) or comma-separated user ids.",
    )
    subject: str = Field(..., min_length=1, max_length=255)
    body: str = Field(..., min_length=1)


class NotificationCreateResponse(BaseModel):
    """Create result mirrors the stored From / To / Subject / Body plus id."""

    model_config = ConfigDict(populate_by_name=True)

    id: int
    from_: str = Field(..., alias="from")
    to: str
    subject: str
    body: str


class NotificationResponse(BaseModel):
    id: str
    module: NotificationModule
    title: str
    message: str
    created_at: datetime
    is_read: bool
    kind: NotificationKind = "general"
    entity_id: Optional[int] = None

    model_config = {"from_attributes": True}


class NotificationListResponse(BaseModel):
    items: List[NotificationResponse]
    total: int
    page: int = 0
    size: int = 50


class NotificationCountResponse(BaseModel):
    count: int


class NotificationMarkReadResponse(BaseModel):
    message: str
    notification_id: str
    already_read: bool


class NotificationModuleMarkReadResponse(BaseModel):
    message: str
    module: NotificationModule
    marked_count: int


class NotificationSettingsResponse(BaseModel):
    syllabus: bool = True
    holiday: bool = True
    notice: bool = True
    exam: bool = True


class NotificationSettingsUpdateRequest(BaseModel):
    syllabus: Optional[bool] = None
    holiday: Optional[bool] = None
    notice: Optional[bool] = None
    exam: Optional[bool] = None


DevicePlatform = Literal["android", "ios", "web"]


class DeviceRegisterRequest(BaseModel):
    """Register or refresh the current user's FCM device token."""

    fcm_token: str = Field(..., min_length=10, max_length=512)
    platform: DevicePlatform


class DeviceRegisterResponse(BaseModel):
    id: int
    fcm_token: str
    platform: str
    is_active: bool
    message: str = "Device registered"
