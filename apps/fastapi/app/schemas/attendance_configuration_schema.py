from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

ConfigurationScope = Literal["entire-school"]
ApplyChangesTo = Literal["future-only"]
EntityStatus = Literal["active", "inactive"]
NotificationChannel = Literal["sms"]
NotificationRecipient = Literal["teacher", "schoolAdmin"]
NotificationTrigger = Literal["missedAttendance"]


class AttendanceMarkedBySchema(BaseModel):
    teacher: bool = True
    school_admin: bool = True


class WorkingDaysSchema(BaseModel):
    monday: bool = True
    tuesday: bool = True
    wednesday: bool = True
    thursday: bool = True
    friday: bool = True
    saturday: bool = False
    sunday: bool = False


class OfficeTimingSchema(BaseModel):
    start_time: str = Field(..., min_length=4, max_length=5)
    end_time: str = Field(..., min_length=4, max_length=5)
    minimum_working_hours: int = Field(..., ge=1, le=24)


class GraceTimeSchema(BaseModel):
    enabled: bool = True
    grace_minutes: int = Field(..., ge=0, le=240)
    status_after_grace: str = Field(..., min_length=1, max_length=30)


class CheckInRulesSchema(BaseModel):
    check_in_mandatory: bool = True
    check_out_mandatory: bool = True
    allow_attendance_without_check_out: bool = False
    allow_multiple_check_in: bool = False
    allow_next_day_check_out: bool = False
    auto_calculate_working_hours: bool = True


class GeneralConfigurationSchema(BaseModel):
    academic_year_id: int = Field(..., ge=1)
    configuration_scope: ConfigurationScope = "entire-school"
    allow_editing_after_marked: bool = True
    apply_changes_to: ApplyChangesTo = "future-only"
    attendance_marked_by: AttendanceMarkedBySchema = Field(
        default_factory=AttendanceMarkedBySchema
    )


class HolidayCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    holiday_date: date
    description: str | None = Field(None, max_length=500)
    status: EntityStatus = "active"


class HolidayUpdateRequest(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=150)
    holiday_date: date | None = None
    description: str | None = Field(None, max_length=500)
    status: EntityStatus | None = None


class HolidayResponse(BaseModel):
    id: int
    name: str
    holiday_date: date
    description: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class ShiftCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    start_time: str = Field(..., min_length=4, max_length=5)
    end_time: str = Field(..., min_length=4, max_length=5)
    status: EntityStatus = "active"


class ShiftUpdateRequest(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    start_time: str | None = Field(None, min_length=4, max_length=5)
    end_time: str | None = Field(None, min_length=4, max_length=5)
    status: EntityStatus | None = None


class ShiftResponse(BaseModel):
    id: int
    name: str
    start_time: str
    end_time: str
    status: str
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class StatusCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    color: str = Field(..., min_length=1, max_length=20)
    is_active: bool = True


class StatusUpdateRequest(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=50)
    color: str | None = Field(None, min_length=1, max_length=20)
    is_active: bool | None = None


class StatusResponse(BaseModel):
    id: int
    name: str
    color: str
    is_active: bool
    sort_order: int
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class NotificationToggleRequest(BaseModel):
    is_enabled: bool


class NotificationResponse(BaseModel):
    id: int
    label: str
    recipients: list[NotificationRecipient]
    triggers: list[NotificationTrigger]
    channels: list[NotificationChannel]
    is_enabled: bool
    created_at: datetime
    updated_at: datetime | None = None


class AttendanceConfigurationUpdateRequest(BaseModel):
    """Update scalar settings for an existing (or get-or-create) configuration."""

    allow_editing_after_marked: bool | None = None
    apply_changes_to: ApplyChangesTo | None = None
    attendance_marked_by: AttendanceMarkedBySchema | None = None
    working_days: WorkingDaysSchema | None = None
    office_timing: OfficeTimingSchema | None = None
    grace_time: GraceTimeSchema | None = None
    check_in_rules: CheckInRulesSchema | None = None


class AttendanceConfigurationResponse(BaseModel):
    id: int
    tenant_id: int
    general: GeneralConfigurationSchema
    working_days: WorkingDaysSchema
    holidays: list[HolidayResponse]
    shifts: list[ShiftResponse]
    office_timing: OfficeTimingSchema
    grace_time: GraceTimeSchema
    statuses: list[StatusResponse]
    check_in_rules: CheckInRulesSchema
    notifications: list[NotificationResponse]
    created_at: datetime
    updated_at: datetime | None = None
