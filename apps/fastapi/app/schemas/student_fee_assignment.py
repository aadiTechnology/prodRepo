from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, Field

class StudentDropdownResponse(BaseModel):
    id: int
    name: str
    class_id: int
    class_name: str

class StudentDetailResponse(BaseModel):
    id: int
    name: str
    class_id: int
    class_name: str
    tenant_id: int | None = None

class CustomStudentFeeInstallment(BaseModel):
    installment_no: int
    amount: float
    due_date: date


class StudentFeeAssignmentCreate(BaseModel):
    student_id: int = Field(...)
    academic_year_id: int = Field(...)
    fee_structure_id: int = Field(...)
    discount_id: Optional[int] = None
    additional_fee: Optional[float] = None  # Added field for additional fee
    remarks: Optional[str] = None
    custom_annual_amount: Optional[float] = None
    custom_discount_amount: Optional[float] = None
    custom_installments: Optional[List[CustomStudentFeeInstallment]] = None

class StudentFeeDetailResponse(BaseModel):
    category: str
    amount: float
    discount_applied: Optional[float] = None
    final_amount: float

class StudentFeeInstallmentResponse(BaseModel):
    installment_no: int
    due_date: datetime
    amount: float
    status: str

class StudentFeeAssignmentResponse(BaseModel):
    message: str
    student_id: int
    total_amount: float
    final_amount: float
    details: List[StudentFeeDetailResponse]
    installments: List[StudentFeeInstallmentResponse]

    class Config:
        from_attributes = True
