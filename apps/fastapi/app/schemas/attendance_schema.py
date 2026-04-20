from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import date, datetime

class AttendanceRecord(BaseModel):
    student_id: int
    status: str # 'Present', 'Absent', 'Half Day', 'Leave'
    remarks: Optional[str] = None

class MarkAttendanceRequest(BaseModel):
    tenant_id: int
    academic_year_id: int
    class_id: int
    class_division_id: int
    attendance_date: date
    records: List[AttendanceRecord]

class AttendanceResponse(BaseModel):
    student_id: int
    student_name: str
    roll_no: Optional[str]
    status: Optional[str]
    remarks: Optional[str]
    
    model_config = ConfigDict(from_attributes=True)

class AttendanceListResponse(BaseModel):
    date: date
    class_id: int
    class_division_id: int
    attendance: List[AttendanceResponse]

# --- Reporting Schemas ---

class AttendanceReportItem(BaseModel):
    date: date
    roll_no: Optional[str]
    student_name: str
    status: str
    type: Optional[str] = None # Short code like HD, L
    remarks: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class AttendanceReportSummary(BaseModel):
    total_present: int = 0
    total_absent: int = 0
    total_half_day: int = 0
    total_leave: int = 0

class AttendanceReportResponse(BaseModel):
    records: List[AttendanceReportItem]
    summary: AttendanceReportSummary
    total_count: int
