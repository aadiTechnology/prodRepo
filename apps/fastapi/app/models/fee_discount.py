from datetime import datetime
from sqlalchemy import Column, Integer, String, DECIMAL, Boolean, Text, DateTime
from app.core.database import Base

class FeeDiscount(Base):
    __tablename__ = "fee_discounts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    discount_name = Column(String(150), nullable=False)
    discount_type = Column(String(20), nullable=False)  # Percentage or Fixed
    discount_value = Column(DECIMAL(10, 2), nullable=False)
    fee_category = Column(String(100), nullable=True)
    applicable_class = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    status = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
