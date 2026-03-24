# Student Fee Ledger Models
from sqlalchemy import Column, Integer, String, Date, DateTime, Numeric, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime

class Student(Base):
    __tablename__ = "students"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=False)
    student_name = Column(String(100), nullable=False)
    student_code = Column(String(50), nullable=False)
    academic_year = Column(String(20), nullable=False)
    class_id = Column(Integer, nullable=True)  # Added class_id for fee structure lookup
    fee_structure_id = Column(Integer, nullable=True)  # Added for unique fee structure per student
    is_active = Column(Boolean, default=True)
    fee_ledgers = relationship("FeeLedger", back_populates="student")

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
    # installments relationship removed
class FeePayment(Base):
    __tablename__ = "fee_payments"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=False)
    student_id = Column(Integer, nullable=False)
    payment_date = Column(DateTime, nullable=False)
    payment_method = Column(String(20), nullable=True)
    reference_no = Column(String(20), nullable=True)
    total_amount = Column(Numeric(10,2), nullable=False)
    notes = Column(String(255), nullable=True)
    created_at = Column(DateTime, nullable=True)
    created_by = Column(Integer, nullable=True)
    fee_installment_id = Column(Integer, ForeignKey("fee_installments.id"), nullable=True)
    paid_amount = Column(Numeric(10,2), nullable=True)
    installment = relationship("FeeInstallment", back_populates="fee_payments")
