from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel

class ClassFeeStructureAssignmentCreate(BaseModel):
    academic_year: str
    class_id: int
    fee_structure_id: int
    effective_date: date

class ClassFeeStructureAssignmentUpdate(BaseModel):
    class_id: Optional[int] = None
    fee_structure_id: Optional[int] = None
    effective_date: Optional[date] = None

class ClassFeeStructureAssignmentDeactivate(BaseModel):
    pass  # No endDate in table

class ClassFeeStructureAssignmentResponse(BaseModel):
    id: int
    academic_year: str
    class_id: int
    fee_structure_id: int
    effective_date: date
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

class ClassFeeStructureAssignmentListResponse(BaseModel):
    success: bool
    data: list[ClassFeeStructureAssignmentResponse]
    pagination: dict

class ClassFeeStructureAssignmentCreateResponse(BaseModel):
    success: bool
    message: str
    data: ClassFeeStructureAssignmentResponse
