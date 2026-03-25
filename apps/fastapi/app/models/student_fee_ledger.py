# Removed the duplicate FeePayment model to avoid conflicts.
# Retained only the FeeLedger model.

from sqlalchemy import Column, Integer, String, Date, DateTime, Numeric, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime

class FeeLedger(Base):
    __tablename__ = "fee_ledger"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    academic_year = Column(String(20), nullable=False)
    total_fee = Column(Numeric(10,2), nullable=False)
    total_paid = Column(Numeric(10,2), nullable=False)
    total_balance = Column(Numeric(10,2), nullable=False)
    student = relationship("Student", back_populates="fee_ledgers")
