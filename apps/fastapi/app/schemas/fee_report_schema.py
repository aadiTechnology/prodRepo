from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel


class FeeReportFilterOptions(BaseModel):
    academic_years: list[dict]
    classes: list[dict]
    installments: list[str]


class FeeReportSummary(BaseModel):
    total_students: int
    total_invoiced: float
    total_collected: float
    total_pending: float
    collection_percentage: float


class FeeReportRow(BaseModel):
    student_id: int
    student_name: str
    student_code: Optional[str] = None
    admission_no: Optional[str] = None
    class_name: Optional[str] = None
    division_name: Optional[str] = None
    invoice_no: str
    installment_label: Optional[str] = None
    invoiced_amount: float
    paid_amount: float
    due_amount: float
    invoice_status: str
    due_date: Optional[date] = None
    invoice_date: Optional[datetime] = None


class FeeReportResponse(BaseModel):
    summary: FeeReportSummary
    items: list[FeeReportRow]
    total: int
    page: int
    size: int
