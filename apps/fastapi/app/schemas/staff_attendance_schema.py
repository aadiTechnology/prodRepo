from __future__ import annotations

from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

StaffAttendanceStatus = Literal[
    "Present", "Absent", "Late", "Half Day", "Leave", "Holiday", "Others"
]
ApprovalStatus = Literal["Waiting for Approval", "Approved", "Rejected"]


class StaffAttendanceMarkRequest(BaseModel):
    teacher_id: int = Field(..., ge=1)
    attendance_date: date
    check_in_time: Optional[str] = Field(None, max_length=5)
    check_out_time: Optional[str] = Field(None, max_length=5)
    remarks: Optional[str] = Field(None, max_length=50)
    status: Optional[StaffAttendanceStatus] = None


class StaffAttendanceApprovalRequest(BaseModel):
    approval_status: ApprovalStatus
    rejection_reason: Optional[str] = Field(None, max_length=500)


class StaffAttendanceResponse(BaseModel):
    id: int
    tenant_id: int
    teacher_id: int
    attendance_date: date
    status: str
    check_in_time: Optional[str] = None
    check_out_time: Optional[str] = None
    remarks: Optional[str] = None
    working_hours_minutes: Optional[int] = None
    overtime_minutes: Optional[int] = None
    is_submitted: bool
    approval_status: str
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class StaffAttendanceListResponse(BaseModel):
    items: list[StaffAttendanceResponse]
    total: int
