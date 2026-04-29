from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class FeePayment(Base):
    __tablename__ = "fee_payments"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="NO ACTION"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)

    payment_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    payment_method = Column(String(30), nullable=False)  # CASH/UPI/BANK_TRANSFER
    reference_no = Column(String(100), nullable=True)
    total_amount = Column(Numeric(10, 2), nullable=False)
    notes = Column(Text, nullable=True)
    payment_status = Column(String(20), nullable=False, default="completed")
    receipt_number = Column(String(50), nullable=True)

    # Bank transfer details
    bank_account_holder_name = Column(String(100), nullable=True)
    bank_account_no = Column(String(20), nullable=True)
    ifsc_code = Column(String(11), nullable=True)

    # Direct installment link
    fee_installment_id = Column(Integer, ForeignKey("fee_installments.id", ondelete="SET NULL"), nullable=True)
    paid_amount = Column(Numeric(10, 2), nullable=True)

    # Academic year for ledger reconciliation
    academic_year_id = Column(Integer, ForeignKey("academic_years.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    allocations = relationship(
        "FeePaymentAllocation",
        back_populates="payment",
        cascade="all, delete-orphan",
    )


class FeePaymentAllocation(Base):
    """Allocation table for multi-installment payments."""
    __tablename__ = "fee_payment_allocations"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="NO ACTION"), nullable=False)
    payment_id = Column(Integer, ForeignKey("fee_payments.id", ondelete="CASCADE"), nullable=False)
    fee_installment_id = Column(
        Integer, ForeignKey("fee_installments.id", ondelete="CASCADE"), nullable=False
    )
    amount_allocated = Column(Numeric(10, 2), nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    payment = relationship("FeePayment", back_populates="allocations")
