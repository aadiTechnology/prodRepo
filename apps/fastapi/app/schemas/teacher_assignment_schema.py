from typing import Optional

from pydantic import BaseModel


class AcademicYearOption(BaseModel):
    id: int
    name: str


class ClassOption(BaseModel):
    id: int
    name: str


class DivisionOption(BaseModel):
    id: int
    division_name: str


class TeacherOption(BaseModel):
    id: int
    full_name: str


class TeacherAssignmentUpsertRequest(BaseModel):
    academic_year_id: int
    class_id: int
    class_division_id: int
    teacher_id: int


class TeacherAssignmentUpsertResponse(BaseModel):
    message: str
    assignment_id: Optional[int] = None


class TeacherAssignmentCheckResponse(BaseModel):
    is_assigned: bool
    teacher_name: Optional[str] = None


class TeacherAssignmentDetailResponse(BaseModel):
    assignment_id: int
    academic_year_id: Optional[int] = None
    class_id: Optional[int] = None
    class_division_id: Optional[int] = None
    teacher_id: Optional[int] = None


class TeacherAssignmentItem(BaseModel):
    id: int
    academic_year_id: Optional[int] = None
    class_id: Optional[int] = None
    class_division_id: Optional[int] = None
    class_name: Optional[str] = None
    division_name: Optional[str] = None
    teacher_id: Optional[int] = None
    teacher_name: Optional[str] = None
    status: str


class TeacherAssignmentPagination(BaseModel):
    page: int
    limit: int
    total: int


class TeacherAssignmentListResponse(BaseModel):
    data: list[TeacherAssignmentItem]
    pagination: TeacherAssignmentPagination
