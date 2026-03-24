from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, constr, condecimal


class FeeCategoryBase(BaseModel):
    """Shared fields for fee categories used in create/update."""

    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    status: bool = True


class FeeCategoryCreate(FeeCategoryBase):
    """Payload for creating a fee category."""

    pass


class FeeCategoryUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    status: Optional[bool] = None


class FeeCategoryResponse(FeeCategoryBase):
    """Response model including identifiers and audit fields."""

    id: str
    tenant_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class FeeInstallmentBase(BaseModel):
    installment_number: int
    amount: Optional[float] = None
    due_date: date
    late_fee_applicable: bool = False
    late_fee_amount: Optional[float] = None
    late_fee_percentage: Optional[float] = None
    description: Optional[str] = None


class FeeInstallmentCreate(FeeInstallmentBase):
    fee_category_id: Optional[str] = None


class FeeInstallmentResponse(FeeInstallmentBase):
    id: int
    fee_structure_id: int
    fee_category_id: Optional[str] = None

    class Config:
        from_attributes = True

class FeeStructureBase(BaseModel):
    class_id: int
    fee_category_id: str
    academic_year_id: int
    total_amount: Optional[float] = None
    installment_type: Optional[str] = None
    num_installments: int
    description: Optional[str] = None
    is_active: bool = True

class FeeStructureCreate(FeeStructureBase):
    installments: List[FeeInstallmentCreate]

class FeeStructureUpdate(BaseModel):
    total_amount: Optional[float] = None
    installment_type: Optional[str] = None
    num_installments: Optional[int] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    installments: Optional[List[FeeInstallmentCreate]] = None

class FeeStructureResponse(FeeStructureBase):
    id: int
    tenant_id: int
    created_at: datetime
    installments: List[FeeInstallmentResponse]
    class_name: Optional[str] = None
    fee_category_name: Optional[str] = None
    academic_year_name: Optional[str] = None

    class Config:
        from_attributes = True

class FeeStructurePaginatedResponse(BaseModel):
    items: List[FeeStructureResponse]
    total: int
    page: int
    size: int
