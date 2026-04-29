from datetime import datetime

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, Numeric, String

from app.core.database import Base


class StudentInvoice(Base):
    __tablename__ = "student_invoices"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="NO ACTION"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="NO ACTION"), nullable=False)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id", ondelete="NO ACTION"), nullable=False)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="NO ACTION"), nullable=False)
    fee_structure_id = Column(Integer, ForeignKey("fee_structures.id", ondelete="NO ACTION"), nullable=False)
    invoice_no = Column(String(50), nullable=False, unique=True)
    total_amount = Column(Numeric(10, 2), nullable=False)
    paid_amount = Column(Numeric(10, 2), nullable=False, default=0)
    due_amount = Column(Numeric(10, 2), nullable=False)
    due_date = Column(Date, nullable=False)
    status = Column(String(20), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    # Link to the specific fee installment this invoice belongs to.
    fee_installment_id = Column(Integer, ForeignKey("fee_installments.id", ondelete="NO ACTION"), nullable=True)
    installment = Column("Installment", String(50), nullable=True)
