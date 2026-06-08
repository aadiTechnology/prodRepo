from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


AudienceType = Literal["ALL", "STUDENT", "TEACHER", "ADMIN"]
NoticeType = Literal["GENERAL", "FEE", "EVENT", "HOLIDAY", "EXAM"]
NoticeStatus = Literal["DRAFT", "PUBLISHED", "UNPUBLISHED", "EXPIRED"]


class NoticeTargetItem(BaseModel):
    class_id: int | None = Field(None, ge=1)
    division_id: int | None = Field(None, ge=1)


class NoticeAttachmentItem(BaseModel):
    file_name: str | None = Field(None, max_length=255)
    file_path: str | None = Field(None, max_length=500)
    file_type: str | None = Field(None, max_length=50)
    file_size_kb: int | None = Field(None, ge=0)

    @field_validator("file_path")
    @classmethod
    def reject_embedded_content(cls, value: str | None) -> str | None:
        if value and value.strip().startswith("data:"):
            raise ValueError(
                "file_path must be a server path; upload files via the attachment endpoint"
            )
        return value


class NoticeCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1)
    audience_type: AudienceType
    notice_type: NoticeType
    publish_date: datetime | None = None
    expiry_date: datetime | None = None
    send_notification: bool = False
    status: NoticeStatus | None = None
    is_draft: bool | None = None
    targets: list[NoticeTargetItem] = Field(default_factory=list)
    attachments: list[NoticeAttachmentItem] = Field(default_factory=list)


class NoticeUpdateRequest(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = Field(None, min_length=1)
    audience_type: AudienceType | None = None
    notice_type: NoticeType | None = None
    publish_date: datetime | None = None
    expiry_date: datetime | None = None
    send_notification: bool | None = None
    status: NoticeStatus | None = None
    is_draft: bool | None = None
    targets: list[NoticeTargetItem] | None = None
    attachments: list[NoticeAttachmentItem] | None = None


class NoticeTargetResponse(BaseModel):
    id: int
    tenant_id: int
    notice_id: int
    class_id: int | None = None
    division_id: int | None = None
    created_at: datetime | None = None
    created_by: int | None = None


class NoticeAttachmentResponse(BaseModel):
    id: int
    tenant_id: int
    notice_id: int
    file_name: str | None = None
    file_path: str | None = None
    file_type: str | None = None
    file_size_kb: int | None = None
    uploaded_at: datetime | None = None
    uploaded_by: int | None = None


class NoticeResponse(BaseModel):
    id: int
    tenant_id: int
    title: str
    description: str
    notice_type: NoticeType
    audience_type: AudienceType
    status: NoticeStatus
    publish_date: datetime
    expiry_date: datetime | None = None
    is_draft: bool
    is_published: bool
    published_at: datetime | None = None
    unpublished_at: datetime | None = None
    send_notification: bool
    created_by: int
    created_at: datetime
    updated_by: int | None = None
    updated_at: datetime | None = None
    is_deleted: bool
    targets: list[NoticeTargetResponse] = Field(default_factory=list)
    attachments: list[NoticeAttachmentResponse] = Field(default_factory=list)


class NoticeListResponse(BaseModel):
    items: list[NoticeResponse]
    total: int
    page: int
    size: int


class NoticeStatusUpdateResponse(BaseModel):
    message: str
    notice: NoticeResponse


class NoticeDropdownOptionsResponse(BaseModel):
    notice_types: list[NoticeType]
    audience_types: list[AudienceType]
    status_types: list[NoticeStatus]
