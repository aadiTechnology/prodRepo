from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, conlist


class FeePaymentAllocationCreate(BaseModel):
    fee_installment_id: int = Field(..., ge=1)
    amount_allocated: float = Field(..., gt=0)


class FeePaymentCollectRequest(BaseModel):
    student_id: int = Field(..., ge=1)
    payment_method: str = Field(..., min_length=1, max_length=30)
    reference_no: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None
    allocations: conlist(FeePaymentAllocationCreate, min_length=1)


class FeePaymentCollectResponse(BaseModel):
    payment_id: int
    student_id: int
    total_amount: float
    payment_date: datetime

