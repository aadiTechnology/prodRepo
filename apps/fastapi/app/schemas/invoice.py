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
    fee_installment_id: Optional[int] = Field(None, ge=1)


class InvoiceUpdateRequest(BaseModel):
    student_id: Optional[int] = Field(None, ge=1)
    academic_year_id: Optional[int] = Field(None, ge=1)
    class_id: Optional[int] = Field(None, ge=1)
    fee_structure_id: Optional[int] = Field(None, ge=1)
    fee_installment_id: Optional[int] = Field(None, ge=1)
    installment: Optional[str] = Field(None, min_length=1, max_length=100)
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
    fee_installment_id: Optional[int] = None
    installment_name: Optional[str] = None


class InvoiceFeeBreakdownItem(BaseModel):
    id: int
    fee_category_id: Optional[str] = None
    fee_category_name: Optional[str] = None
    amount: float
    discount_amount: float = 0
    paid_amount: float = 0
    pending_amount: float = 0
    payable_for: Optional[str] = None
    invoice_id: Optional[int] = None
    due_date: Optional[date] = None
    payment_id: Optional[int] = None
    payment_date: Optional[datetime] = None
    payment_method: Optional[str] = None
    status: Optional[str] = None
    payment_status: Optional[str] = None


class InvoicePaymentHistoryItem(BaseModel):
    payment_id: int
    payment_date: datetime
    amount: float
    payment_method: str
    reference_no: Optional[str] = None


class InvoiceStudentInfo(BaseModel):
    student_id: int
    student_name: str
    admission_no: Optional[str] = None
    roll_no: Optional[str] = None
    class_id: int
    class_name: Optional[str] = None
    division_id: Optional[int] = None
    division_name: Optional[str] = None


class InvoicePaymentSummary(BaseModel):
    total_amount: float
    paid_amount: float
    due_amount: float


class InvoiceDetailResponse(BaseModel):
    invoice: InvoiceResponse
    student_info: InvoiceStudentInfo
    fee_breakdown: list[InvoiceFeeBreakdownItem]
    payment_summary: InvoicePaymentSummary
    payment_history: list[InvoicePaymentHistoryItem]
    available_actions: list[str]


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
    fee_structure_id: int = Field(..., ge=1)
    installment_name: str = Field(..., min_length=1, max_length=100)
    invoice_date: date
    due_date: date
    student_ids: list[int] = Field(default_factory=list)


class GenerateInvoiceResponse(BaseModel):
    created_count: int
    skipped_count: int
    message: str
    skipped_student_ids: list[int] = Field(default_factory=list)
