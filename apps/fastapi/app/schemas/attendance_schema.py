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
