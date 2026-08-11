from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

SupportStatus = Literal["Not Started", "In Progress", "Done", "TBD"]
FaqLanguage = Literal["English", "Marathi", "Hindi"]
ReleaseNoteFileType = Literal["pdf", "doc", "docx"]

SUPPORT_STATUSES: tuple[str, ...] = ("Not Started", "In Progress", "Done", "TBD")
FAQ_LANGUAGES: tuple[str, ...] = ("English", "Marathi", "Hindi")


class FaqAttachmentResponse(BaseModel):
    id: int
    name: str
    type: Literal["pdf", "image"]
    url: str
    file_size_kb: int | None = None


class FaqCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    question: str = Field(..., min_length=1, max_length=1000)
    answer: str = Field(..., min_length=1)
    module_name: str = Field(..., min_length=1, max_length=100, alias="module")
    category_id: str = Field(..., min_length=1, max_length=100)
    category_path: str | None = Field(None, max_length=255)
    status: SupportStatus = "Not Started"
    owner: str = Field(..., min_length=1, max_length=100)
    language: FaqLanguage = "English"
    tenant_id: int | None = Field(None, ge=1)

    model_config = {"populate_by_name": True}


class FaqUpdateRequest(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    question: str | None = Field(None, min_length=1, max_length=1000)
    answer: str | None = Field(None, min_length=1)
    module_name: str | None = Field(None, min_length=1, max_length=100, alias="module")
    category_id: str | None = Field(None, min_length=1, max_length=100)
    category_path: str | None = Field(None, max_length=255)
    status: SupportStatus | None = None
    owner: str | None = Field(None, min_length=1, max_length=100)
    language: FaqLanguage | None = None
    tenant_id: int | None = Field(None, ge=1)

    model_config = {"populate_by_name": True}


class FaqResponse(BaseModel):
    id: int
    sr_no: int | None = None
    title: str
    question: str
    answer: str
    module: str
    category_id: str
    category_path: str
    status: SupportStatus
    owner: str
    tenant_id: int
    tenant_name: str
    language: FaqLanguage
    attachments: list[FaqAttachmentResponse] = Field(default_factory=list)
    created_at: datetime
    last_modified_at: datetime | None = None
    created_by: str
    modified_by: str | None = None


class FaqListResponse(BaseModel):
    items: list[FaqResponse]
    total: int
    page: int
    size: int


class FaqFeedbackRequest(BaseModel):
    is_helpful: bool
    comment: str | None = Field(None, max_length=2000)


class FaqFeedbackResponse(BaseModel):
    id: int
    faq_id: int
    is_helpful: bool
    comment: str | None = None
    created_at: datetime


class ProductUpdateCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    version: str = Field(..., min_length=1, max_length=50)
    release_date: date
    description: str = Field(..., min_length=1)
    status: SupportStatus = "Not Started"


class ProductUpdateUpdateRequest(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    version: str | None = Field(None, min_length=1, max_length=50)
    release_date: date | None = None
    description: str | None = Field(None, min_length=1)
    status: SupportStatus | None = None


class ProductUpdateResponse(BaseModel):
    id: int
    title: str
    version: str
    release_date: date
    description: str
    status: SupportStatus
    attachment_name: str | None = None
    attachment_type: ReleaseNoteFileType | None = None
    attachment_url: str | None = None
    created_by: str
    modified_by: str | None = None
    modified_date: datetime | None = None


class ProductUpdateListResponse(BaseModel):
    items: list[ProductUpdateResponse]
    total: int
    page: int
    size: int
