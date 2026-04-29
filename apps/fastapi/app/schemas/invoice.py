from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field


class InvoiceBase(BaseModel):
    student_id: int = Field(..., ge=1)
    academic_year_id: int = Field(..., ge=1)
    class_id: int = Field(..., ge=1)
    fee_structure_id: int = Field(..., ge=1)
    invoice_no: str = Field(..., min_length=1, max_length=50)
    total_amount: float = Field(..., ge=0)
    paid_amount: float = Field(0, ge=0)
    due_amount: float = Field(..., ge=0)
    due_date: date


class InvoiceCreateRequest(InvoiceBase):
    pass


class InvoiceUpdateRequest(BaseModel):
    academic_year_id: Optional[int] = Field(None, ge=1)
    class_id: Optional[int] = Field(None, ge=1)
    fee_structure_id: Optional[int] = Field(None, ge=1)
    invoice_no: Optional[str] = Field(None, min_length=1, max_length=50)
    total_amount: Optional[float] = Field(None, ge=0)
    paid_amount: Optional[float] = Field(None, ge=0)
    due_amount: Optional[float] = Field(None, ge=0)
    due_date: Optional[date] = None


class InvoiceResponse(BaseModel):
    id: int
    tenant_id: int
    student_id: int
    student_name: str
    admission_no: Optional[str] = None
    academic_year_id: int
    class_id: int
    class_name: Optional[str] = None
    fee_structure_id: int
    invoice_no: str
    installment: Optional[str] = None
    total_amount: float
    paid_amount: float
    due_amount: float
    due_date: date
    status: str
    created_at: datetime


class InvoiceListResponse(BaseModel):
    items: list[InvoiceResponse]
    total: int
    page: int
    size: int


class FeePlanResponse(BaseModel):
    id: int
    class_id: int
    division_id: Optional[int] = None
    academic_year_id: int
    total_amount: float
    name: Optional[str] = None


class InvoiceStudentItem(BaseModel):
    id: int
    student_name: str
    admission_no: Optional[str] = None
    student_code: Optional[str] = None
    roll_no: Optional[str] = None
    class_name: Optional[str] = None
    division_name: Optional[str] = None
    is_invoice_generated: bool


class GenerateInvoiceRequest(BaseModel):
    academic_year_id: int = Field(..., ge=1)
    class_id: int = Field(..., ge=1)
    division_id: int = Field(..., ge=1)
    installment_name: str = Field(..., min_length=1, max_length=100)
    invoice_date: date
    due_date: date
    student_ids: list[int] = Field(default_factory=list)


class GenerateInvoiceResponse(BaseModel):
    created_count: int
    skipped_count: int
    message: str
    skipped_student_ids: list[int] = Field(default_factory=list)
