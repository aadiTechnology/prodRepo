from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field


class FeeInstallmentStatusSummary(BaseModel):
    total_due: float = Field(..., ge=0)
    total_paid: float = Field(..., ge=0)
    outstanding_balance: float = Field(..., ge=0)


class FeeInstallmentStatusItem(BaseModel):
    fee_installment_id: int
    installment: str
    category: str
    due_date: date
    amount: float = Field(..., ge=0)
    paid: float = Field(..., ge=0)
    balance: float = Field(..., ge=0)
    status: str  # Paid / Partial / Pending / Overdue


class FeeInstallmentStatusResponse(BaseModel):
    summary: FeeInstallmentStatusSummary
    installments: list[FeeInstallmentStatusItem]

