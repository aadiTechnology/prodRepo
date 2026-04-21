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
