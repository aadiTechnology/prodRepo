from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, conlist

PaymentMethod = Literal["CASH", "UPI", "BANK_TRANSFER"]


class FeePaymentAllocationCreate(BaseModel):
    fee_installment_id: int = Field(..., ge=1)
    amount_allocated: float = Field(..., gt=0)


class FeePaymentCollectRequest(BaseModel):
    student_id: int = Field(..., ge=1)
    tenant_id: Optional[int] = Field(None, ge=1)
    payment_method: PaymentMethod
    reference_no: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None
    allocations: conlist(FeePaymentAllocationCreate, min_length=1)


class InvoicePaymentCollectRequest(BaseModel):
    invoice_id: int = Field(..., ge=1)
    tenant_id: Optional[int] = Field(None, ge=1)
    payment_amount: float = Field(..., gt=0)
    payment_method: PaymentMethod
    reference_no: Optional[str] = Field(None, max_length=100)
    payment_date: Optional[datetime] = None
    notes: Optional[str] = None
    bank_account_holder_name: Optional[str] = Field(None, max_length=100)
    bank_account_no: Optional[str] = Field(None, max_length=20)
    ifsc_code: Optional[str] = Field(None, max_length=11)


class FeePaymentCollectResponse(BaseModel):
    payment_id: int
    student_id: int
    total_amount: float
    payment_date: datetime
    receipt_number: Optional[str] = None


class FeeReceiptPaymentLineItem(BaseModel):
    sr_no: int
    txn_number: Optional[str] = None
    payment_type: str
    bank_name: Optional[str] = None
    amount: float


class FeeReceiptFeeDetailItem(BaseModel):
    sr_no: int
    fee_category_name: Optional[str] = None
    payable_for: Optional[str] = None
    amount: float
    paid_amount: float


class FeeReceiptDetailResponse(BaseModel):
    payment_id: int
    receipt_number: Optional[str] = None
    payment_date: datetime
    payment_method: str
    transaction_number: Optional[str] = None
    total_amount: float
    amount_in_words: str
    notes: Optional[str] = None
    student_name: str
    parent_name: Optional[str] = None
    admission_no: Optional[str] = None
    class_name: Optional[str] = None
    division_name: Optional[str] = None
    academic_year: Optional[str] = None
    invoice_no: Optional[str] = None
    installment: Optional[str] = None
    paid_for: Optional[str] = None
    created_by_name: Optional[str] = None
    payment_lines: list[FeeReceiptPaymentLineItem]
    fee_details: list[FeeReceiptFeeDetailItem] = []

