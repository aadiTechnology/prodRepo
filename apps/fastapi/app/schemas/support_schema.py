from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

SupportQueryStatus = Literal["Open", "In Progress", "Resolved", "Closed"]
SupportQueryActorRole = Literal["SUPER_ADMIN", "ADMIN", "TEACHER", "STUDENT"]
ReleaseNoteFileType = Literal["pdf", "doc", "docx"]

QUERY_STATUSES: tuple[str, ...] = ("Open", "In Progress", "Resolved", "Closed")
QUERY_CATEGORIES: tuple[str, ...] = (
    "Technical Issue",
    "Student Related",
    "Attendance",
    "Fees",
    "Other",
)
ACTOR_ROLES: tuple[str, ...] = ("SUPER_ADMIN", "ADMIN", "TEACHER", "STUDENT")


class SupportQueryMessageResponse(BaseModel):
    id: str
    author: str
    author_role: str
    body: str
    created_at: datetime


class SupportQueryCreateRequest(BaseModel):
    category: str = Field(..., min_length=1, max_length=100)
    subject: str = Field(..., min_length=1, max_length=500)
    description: str = Field(..., min_length=1)
    attachment_name: str | None = Field(None, max_length=255)


class SupportQueryUpdateRequest(BaseModel):
    category: str | None = Field(None, min_length=1, max_length=100)
    subject: str | None = Field(None, min_length=1, max_length=500)
    description: str | None = Field(None, min_length=1)
    status: SupportQueryStatus | None = None


class SupportQueryMessageCreateRequest(BaseModel):
    body: str = Field(..., min_length=1)
    status: SupportQueryStatus | None = None


class SupportQueryResponse(BaseModel):
    id: str
    category: str
    subject: str
    description: str
    attachment_name: str | None = None
    attachment_url: str | None = None
    created_by: str
    created_by_role: SupportQueryActorRole
    created_at: datetime
    status: SupportQueryStatus
    messages: list[SupportQueryMessageResponse] = Field(default_factory=list)
    forwarded_to_super_admin: bool = False
    forwarded_by: str | None = None
    forwarded_at: datetime | None = None
    is_viewed: bool = False


class SupportQueryListResponse(BaseModel):
    items: list[SupportQueryResponse]
    total: int
    page: int
    size: int


class ReleaseNoteShowToRequest(BaseModel):
    admin: bool = False
    teacher: bool = False
    student: bool = False


class ReleaseNoteShowToResponse(BaseModel):
    admin: bool
    teacher: bool
    student: bool


class ReleaseNoteCreateRequest(BaseModel):
    version: str = Field(..., min_length=1, max_length=50)
    release_date: date
    description: str = Field(..., min_length=1)
    show_to: ReleaseNoteShowToRequest = Field(default_factory=ReleaseNoteShowToRequest)


class ReleaseNoteUpdateRequest(BaseModel):
    version: str | None = Field(None, min_length=1, max_length=50)
    release_date: date | None = None
    description: str | None = Field(None, min_length=1)
    show_to: ReleaseNoteShowToRequest | None = None


class ReleaseNoteResponse(BaseModel):
    id: int
    title: str
    version: str
    release_date: date
    description: str
    status: str
    attachment_name: str | None = None
    attachment_type: ReleaseNoteFileType | None = None
    attachment_url: str | None = None
    created_by: str
    modified_by: str | None = None
    modified_date: datetime | None = None
    show_to: ReleaseNoteShowToResponse


class ReleaseNoteListResponse(BaseModel):
    items: list[ReleaseNoteResponse]
    total: int
    page: int
    size: int


class SupportUnreadCountResponse(BaseModel):
    count: int


class SupportMarkViewedResponse(BaseModel):
    query_key: str
    already_viewed: bool
