from typing import Optional
from pydantic import BaseModel, Field, validator

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
    fee_category: Optional[str]
    applicable_class: Optional[str]
    description: Optional[str] = None
    status: bool
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    @classmethod
    def from_orm(cls, obj):
        return cls(
            id=obj.id,
            discount_name=obj.discount_name,
            discount_type=obj.discount_type,
            discount_value=float(obj.discount_value),
            fee_category=getattr(obj, 'fee_category', None),
            applicable_class=getattr(obj, 'applicable_class', None),
            description=getattr(obj, 'description', None),
            status=obj.status,
            created_at=str(obj.created_at) if hasattr(obj, 'created_at') and obj.created_at else None,
            updated_at=str(obj.updated_at) if hasattr(obj, 'updated_at') and obj.updated_at else None,
        )

    class Config:
        orm_mode = True
