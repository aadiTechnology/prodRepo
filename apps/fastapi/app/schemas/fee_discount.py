from typing import Optional
from pydantic import BaseModel, Field, validator, field_validator
from datetime import datetime

class FeeDiscountBase(BaseModel):
    discount_name: str = Field(..., max_length=150)
    discount_type: str = Field(..., max_length=20)
    discount_value: float
    fee_category: Optional[str] = None
    applicable_class: Optional[str] = None
    description: Optional[str] = None
    status: Optional[bool] = True

    @validator("discount_name")
    def name_required(cls, v):
        if not v or not v.strip():
            raise ValueError("Discount name is required")
        return v

    @validator("discount_value")
    def value_required(cls, v, values):
        if v is None:
            raise ValueError("Discount value is required")
        if v < 0:
            raise ValueError("Discount value cannot be negative")
        if values.get("discount_type", "").lower() == "percentage" and v > 100:
            raise ValueError("Percentage cannot exceed 100%")
        return v

class FeeDiscountCreate(FeeDiscountBase):
    pass

class FeeDiscountUpdate(FeeDiscountBase):
    discount_name: Optional[str] = None
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    fee_category: Optional[str] = None
    applicable_class: Optional[str] = None

class FeeDiscountResponse(BaseModel):
    id: int
    discount_name: str
    discount_type: str
    discount_value: float
    fee_category: Optional[str] = None
    applicable_class: Optional[str] = None
    description: Optional[str] = None
    status: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
