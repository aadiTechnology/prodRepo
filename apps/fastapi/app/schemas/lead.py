from typing import Optional, List
from pydantic import BaseModel, Field, validator
from datetime import datetime, date


# ──────────────────────────────────────────────────────────────
# Parent Schemas
# ──────────────────────────────────────────────────────────────

class ParentCreate(BaseModel):
    parent_name: str = Field(..., max_length=200)
    mobile_number: str = Field(..., max_length=15)
    alternate_mobile: Optional[str] = Field(None, max_length=15)
    email: Optional[str] = Field(None, max_length=100)
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pin_code: Optional[str] = None
    relationship: Optional[str] = None

    @validator("parent_name")
    def name_required(cls, v):
        if not v or not v.strip():
            raise ValueError("Parent Name is required")
        return v.strip()

    @validator("mobile_number")
    def mobile_required(cls, v):
        if not v or not v.strip():
            raise ValueError("Contact number is required")
        if not v.strip().isdigit() or len(v.strip()) < 10:
            raise ValueError("Invalid mobile number")
        return v.strip()


class ParentResponse(BaseModel):
    id: int
    parent_name: str
    mobile_number: str
    alternate_mobile: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pin_code: Optional[str] = None
    relationship: Optional[str] = None
    society: Optional[str] = None

    class Config:
        from_attributes = True


# ──────────────────────────────────────────────────────────────
# Lead Source Schemas
# ──────────────────────────────────────────────────────────────

class LeadSourceResponse(BaseModel):
    id: int
    name: str
    code: str
    is_active: bool

    class Config:
        from_attributes = True


# ──────────────────────────────────────────────────────────────
# Lead Status Schemas
# ──────────────────────────────────────────────────────────────

class LeadStatusResponse(BaseModel):
    id: int
    name: str
    code: str
    color_code: Optional[str] = None
    sequence_order: int
    is_terminal: bool

    class Config:
        from_attributes = True


# ──────────────────────────────────────────────────────────────
# Lead Followup Schemas
# ──────────────────────────────────────────────────────────────

class LeadFollowupCreate(BaseModel):
    lead_id: int
    followup_date: date
    followup_time: Optional[str] = None
    followup_type: str = Field(..., max_length=20)  # Call, Visit, Email, WhatsApp
    followup_notes: Optional[str] = None
    next_followup_date: Optional[date] = None

    @validator("followup_date")
    def date_not_past(cls, v):
        from datetime import date as dt
        if v < dt.today():
            raise ValueError("Follow-up date cannot be in the past")
        return v

    @validator("followup_type")
    def valid_type(cls, v):
        allowed = {"Call", "Visit", "Email", "WhatsApp"}
        if v not in allowed:
            raise ValueError(f"followup_type must be one of {allowed}")
        return v


class LeadFollowupResponse(BaseModel):
    id: int
    lead_id: int
    followup_date: date
    followup_type: str
    followup_notes: Optional[str] = None
    followup_status: str
    completed_at: Optional[datetime] = None
    completion_notes: Optional[str] = None
    next_followup_date: Optional[date] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ──────────────────────────────────────────────────────────────
# Lead Schemas
# ──────────────────────────────────────────────────────────────

class LeadCreate(BaseModel):
    # Parent info (create or link existing)
    parent_name: str = Field(..., max_length=200)
    mobile_number: str = Field(..., max_length=15)
    alternate_mobile: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pin_code: Optional[str] = None
    relationship: Optional[str] = None

    # Child info
    child_name: str = Field(..., max_length=150)
    child_dob: Optional[date] = None
    child_gender: Optional[str] = None

    # Lead meta
    lead_source_id: int
    lead_status_id: int
    preferred_class_id: Optional[int] = None
    preferred_academic_year_id: Optional[int] = None
    expected_admission_date: Optional[date] = None
    notes: Optional[str] = None
    remarks: Optional[str] = None
    assigned_to: Optional[int] = None
    society: Optional[str] = Field(None, max_length=200)

    @validator("parent_name")
    def name_required(cls, v):
        if not v or not v.strip():
            raise ValueError("Parent Name is required")
        return v.strip()

    @validator("mobile_number")
    def mobile_required(cls, v):
        if not v or not v.strip():
            raise ValueError("Contact number is required")
        if not v.strip().isdigit() or len(v.strip()) < 10:
            raise ValueError("Invalid mobile number")
        return v.strip()

    @validator("child_name")
    def child_name_required(cls, v):
        if not v or not v.strip():
            raise ValueError("Child name is required")
        return v.strip()


class LeadUpdate(BaseModel):
    parent_name: Optional[str] = None
    mobile_number: Optional[str] = None
    alternate_mobile: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pin_code: Optional[str] = None
    relationship: Optional[str] = None

    child_name: Optional[str] = None
    child_dob: Optional[date] = None
    child_gender: Optional[str] = None

    lead_source_id: Optional[int] = None
    lead_status_id: Optional[int] = None
    preferred_class_id: Optional[int] = None
    preferred_academic_year_id: Optional[int] = None
    expected_admission_date: Optional[date] = None
    notes: Optional[str] = None
    remarks: Optional[str] = None
    assigned_to: Optional[int] = None
    society: Optional[str] = Field(None, max_length=200)


class LeadListItem(BaseModel):
    id: int
    lead_code: str
    child_name: str
    child_gender: Optional[str] = None
    parent_name: Optional[str] = None
    mobile_number: Optional[str] = None
    source_name: Optional[str] = None
    status_name: Optional[str] = None
    status_color: Optional[str] = None
    next_followup_date: Optional[date] = None
    assigned_to: Optional[int] = None
    created_at: Optional[datetime] = None
    converted: bool = False

    class Config:
        from_attributes = True


class LeadDetailResponse(BaseModel):
    id: int
    lead_code: str
    tenant_id: int
    parent: Optional[ParentResponse] = None
    child_name: str
    child_dob: Optional[date] = None
    child_gender: Optional[str] = None
    lead_source_id: int
    lead_status_id: int
    source_name: Optional[str] = None
    status_name: Optional[str] = None
    status_color: Optional[str] = None
    preferred_class_id: Optional[int] = None
    preferred_academic_year_id: Optional[int] = None
    expected_admission_date: Optional[date] = None
    notes: Optional[str] = None
    remarks: Optional[str] = None
    assigned_to: Optional[int] = None
    next_followup_date: Optional[date] = None
    converted_to_student_id: Optional[int] = None
    converted_at: Optional[datetime] = None
    followups: List[LeadFollowupResponse] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
