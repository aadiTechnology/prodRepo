"""Dashboard response schemas."""
from typing import Annotated, List, Literal, Optional, Union

from pydantic import BaseModel, Field

class AttendanceOverview(BaseModel):
    """Attendance statistics overview."""
    present: int = Field(default=0)
    absent: int = Field(default=0)
    half_day: int = Field(default=0)
    leave: int = Field(default=0)

class LeadStatusCount(BaseModel):
    """Lead counts grouped by status."""
    status: str
    color_code: Optional[str] = None
    count: int = Field(default=0)

class FeeCollectionSummary(BaseModel):
    """Summary of overall fees inside a tenant."""
    total_fee: float = Field(default=0.0)
    total_paid: float = Field(default=0.0)
    total_balance: float = Field(default=0.0)

class ClassStudentCount(BaseModel):
    """Per-class student count for admin snapshot."""
    class_name: str
    count: int = Field(default=0)

class StudentSnapshot(BaseModel):
    """Snapshot of total student enrollment and classes."""
    active_students: int = Field(default=0)
    total_classes: int = Field(default=0)
    boys_count: int = Field(default=0)
    girls_count: int = Field(default=0)
    class_breakdown: List[ClassStudentCount] = Field(default_factory=list)

class RecentNoticeItem(BaseModel):
    """A single notice/holiday summary for dashboard display."""
    id: int
    title: str
    notice_type: str
    item_type: str = "notice"  # "notice" | "holiday"
    published_at: Optional[str] = None
    priority: Optional[str] = None

class AdminDashboardResponse(BaseModel):
    """Unified dashboard data for SYSTEM_ADMIN and TENANT_ADMIN."""
    kind: Literal["admin"] = "admin"
    attendance_overview: AttendanceOverview
    lead_pipeline: List[LeadStatusCount] = Field(default_factory=list)
    fee_collection: FeeCollectionSummary
    student_snapshot: StudentSnapshot
    recent_notices: List[RecentNoticeItem] = Field(default_factory=list)

class AssignedClassInfo(BaseModel):
    """Information about a class assigned to a teacher."""
    class_id: int
    class_name: str
    division_id: int
    division_name: str
    student_count: int = Field(default=0)
    boys_count: int = Field(default=0)
    girls_count: int = Field(default=0)
    new_this_month: int = Field(default=0)
    designation: str = "Class Teacher"
    subject_id: Optional[int] = None
    subject_name: Optional[str] = None

class AbsenteeDetail(BaseModel):
    """Detail of a student who is marked absent today."""
    student_id: int
    student_name: str
    class_name: str
    division_name: str
    remarks: Optional[str] = None

class WeeklyTrendPoint(BaseModel):
    """Data point for dynamic weekly attendance trend charts."""
    date: str
    present_rate: float = Field(default=0.0)

class TeacherHomeworkItem(BaseModel):
    """A single homework assignment summary for teacher dashboard."""
    id: int
    title: str
    subject_name: Optional[str] = None
    class_name: Optional[str] = None
    division_name: Optional[str] = None
    assigned_date: Optional[str] = None
    submission_date: Optional[str] = None
    status: str = "Published"

class TeacherDashboardResponse(BaseModel):
    """Dashboard statistics and action lists tailored for teachers."""
    kind: Literal["teacher"] = "teacher"
    assigned_classes: List[AssignedClassInfo] = Field(default_factory=list)
    today_attendance: AttendanceOverview
    absentees_list: List[AbsenteeDetail] = Field(default_factory=list)
    weekly_trend: List[WeeklyTrendPoint] = Field(default_factory=list)
    recent_notices: List[RecentNoticeItem] = Field(default_factory=list)
    recent_homework: List[TeacherHomeworkItem] = Field(default_factory=list)
    # full = at least one class-teacher assignment; subject_focused = subject-teacher only
    dashboard_mode: str = "full"
    class_teacher_slot_count: int = 0
    subject_teacher_slot_count: int = 0
    can_mark_attendance: bool = True

class StudentProfileInfo(BaseModel):
    """Student identity profile info."""
    student_id: int
    student_name: str
    roll_no: Optional[str] = None
    admission_no: Optional[str] = None
    class_name: Optional[str] = None
    division_name: Optional[str] = None
    photo_url: Optional[str] = None
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    admission_date: Optional[str] = None

class StudentAttendanceSummary(BaseModel):
    """Total attendance counts and percentage for a student."""
    present: int = Field(default=0)
    absent: int = Field(default=0)
    half_day: int = Field(default=0)
    leave: int = Field(default=0)
    percentage: float = Field(default=0.0)

class StudentFeeStatus(BaseModel):
    """Student fee ledger state with active flags."""
    total_fee: float = Field(default=0.0)
    total_paid: float = Field(default=0.0)
    total_balance: float = Field(default=0.0)
    is_overdue: bool = Field(default=False)
    next_due_date: Optional[str] = None

class StudentHomeworkSummary(BaseModel):
    """Pending homework count for student."""
    pending_count: int = Field(default=0)
    total_count: int = Field(default=0)

class StudentDashboardResponse(BaseModel):
    """Unified profile, academic, and financial dashboard for students."""
    kind: Literal["student"] = "student"
    profile: StudentProfileInfo
    attendance: StudentAttendanceSummary
    fee_status: StudentFeeStatus
    class_teacher: Optional[str] = None
    homework: StudentHomeworkSummary = Field(default_factory=StudentHomeworkSummary)
    recent_notices: List[RecentNoticeItem] = Field(default_factory=list)

DashboardDataUnion = Annotated[
    Union[AdminDashboardResponse, TeacherDashboardResponse, StudentDashboardResponse],
    Field(discriminator="kind"),
]


class DashboardResponse(BaseModel):
    """Wrapper response model from GET /api/dashboard/me."""
    role: str  # "SYSTEM_ADMIN", "TENANT_ADMIN", "TEACHER", "STUDENT"
    data: DashboardDataUnion | None = None
