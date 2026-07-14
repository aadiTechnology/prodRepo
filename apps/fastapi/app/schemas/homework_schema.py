from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, field_validator

from app.utils.homework_status import HOMEWORK_STATUS_ACTIVE, HOMEWORK_STATUS_DRAFT, normalize_homework_status


# ---------------------------------------------------------------------------
# Attachment
# ---------------------------------------------------------------------------

class HomeworkAttachmentResponse(BaseModel):
    id: int
    homework_id: int
    file_name: str
    file_path: str
    file_type: Optional[str] = None
    file_size_kb: Optional[int] = None
    uploaded_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Create / Update
# ---------------------------------------------------------------------------

class HomeworkCreate(BaseModel):
    # Optional: admin can pass teacher_id explicitly; teachers have it auto-resolved
    teacher_id: Optional[int] = None
    class_id: int
    class_division_id: Optional[int] = None
    subject_id: int
    academic_year_id: int
    title: str
    instructions: Optional[str] = None
    assigned_date: date
    submission_date: Optional[date] = None
    notify_parents: bool = False
    # "Draft" saves without publishing; "Active" publishes immediately
    status: str = HOMEWORK_STATUS_DRAFT

    @field_validator("status")
    @classmethod
    def normalize_status(cls, v: str) -> str:
        normalized = normalize_homework_status(v)
        if normalized not in {HOMEWORK_STATUS_DRAFT, HOMEWORK_STATUS_ACTIVE}:
            raise ValueError("status must be Draft or Active")
        return normalized

    @field_validator("submission_date")
    @classmethod
    def submission_after_assigned(cls, v: Optional[date], info: any) -> Optional[date]:
        if v is None:
            return v
        assigned = info.data.get("assigned_date")
        if assigned and v < assigned:
            raise ValueError("Submission date cannot be before assigned date")
        return v


class HomeworkUpdate(BaseModel):
    class_division_id: Optional[int] = None
    subject_id: Optional[int] = None
    title: Optional[str] = None
    instructions: Optional[str] = None
    assigned_date: Optional[date] = None
    submission_date: Optional[date] = None
    notify_parents: Optional[bool] = None
    status: Optional[str] = None

    @field_validator("status")
    @classmethod
    def normalize_status(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        normalized = normalize_homework_status(v)
        if normalized not in {HOMEWORK_STATUS_DRAFT, HOMEWORK_STATUS_ACTIVE}:
            raise ValueError("status must be Draft or Active")
        return normalized

    @field_validator("submission_date")
    @classmethod
    def submission_after_assigned(cls, v: Optional[date], info: any) -> Optional[date]:
        if v is None:
            return v
        assigned = info.data.get("assigned_date")
        if assigned and v < assigned:
            raise ValueError("Submission date cannot be before assigned date")
        return v


# ---------------------------------------------------------------------------
# Response
# ---------------------------------------------------------------------------

class HomeworkResponse(BaseModel):
    id: int
    tenant_id: int
    teacher_id: int
    teacher_name: Optional[str] = None
    class_id: int
    class_name: Optional[str] = None
    class_division_id: Optional[int] = None
    division_name: Optional[str] = None
    subject_id: int
    subject_name: Optional[str] = None
    academic_year_id: int
    academic_year_name: Optional[str] = None
    title: str
    instructions: Optional[str] = None
    assigned_date: date
    submission_date: Optional[date] = None
    status: str
    notify_parents: bool
    published_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    attachments: List[HomeworkAttachmentResponse] = []

    model_config = {"from_attributes": True}


class HomeworkListResponse(BaseModel):
    data: List[HomeworkResponse]
    total: int
    page: int
    size: int
    pages: int


class HomeworkUnreadCountResponse(BaseModel):
    count: int


class HomeworkMarkViewedResponse(BaseModel):
    message: str
    homework_id: int
    already_viewed: bool = False


# ---------------------------------------------------------------------------
# Dropdown helpers
# ---------------------------------------------------------------------------

class SubjectOption(BaseModel):
    id: int
    name: str
    code: str

    model_config = {"from_attributes": True}


class DivisionOption(BaseModel):
    id: int
    division_name: str

    model_config = {"from_attributes": True}


class ClassOption(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}
