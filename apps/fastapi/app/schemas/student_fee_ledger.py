
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
# Student Fee Ledger Schemas


class StudentLedgerSchema(BaseModel):
    id: int
    student_name: str
    student_code: str
    academic_year: str

class InstallmentLedgerSchema(BaseModel):
    installment: int
    category: str
    due_date: str
    amount: float
    paid: float
    balance: float

class InstallmentLedgerListResponse(BaseModel):
    student: Optional[StudentLedgerSchema] = None
    installments: List[InstallmentLedgerSchema]

class InstallmentTableSchema(BaseModel):
    installment: int
    category: str
    due_date: str
    amount: float
    paid: float
    balance: float

class FeeLedgerTableResponse(BaseModel):
    student: 'StudentLedgerSchema'
    summary: 'FeeLedgerSummarySchema'
    installments: List[InstallmentTableSchema]

class StudentDropdown(BaseModel):
    id: int
    student_name: str
    student_code: str
    academic_year: str

class FeeInstallmentSchema(BaseModel):
    installment: str
    category: Optional[str] = None
    due_date: date
    amount: float
    paid: float
    balance: float
    status: str

class FeeLedgerSummarySchema(BaseModel):
    total_fee: float
    total_paid: float
    outstanding: float

class StudentLedgerSchema(BaseModel):
    id: int
    student_name: str
    student_code: str
    academic_year: str

class FeeLedgerResponse(BaseModel):
    student: StudentLedgerSchema
    summary: FeeLedgerSummarySchema
    installments: List[FeeInstallmentSchema]

class FeeLedgerDownloadResponse(BaseModel):
    student_id: int
    file_url: Optional[str] = None
    file_type: str

class PaymentSchema(BaseModel):
    id: int
    tenant_id: int
    student_id: int
    installment_id: int
    amount_paid: float
    payment_date: datetime

class ErrorResponse(BaseModel):
    detail: str

class StudentSearchQuery(BaseModel):
    search: Optional[str] = None

class StudentDropdownListResponse(BaseModel):
    students: List[StudentDropdown]

class EmptyArrayResponse(BaseModel):
    data: List = Field(default_factory=list)
