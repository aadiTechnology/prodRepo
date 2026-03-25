from datetime import datetime
from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, DateTime, Date, Enum
from sqlalchemy.orm import relationship
from app.core.database import Base


class StudentFeeAssignment(Base):
    __tablename__ = "student_fee_assignments"
    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id"), nullable=False)
    fee_structure_id = Column(Integer, ForeignKey("fee_structures.id"), nullable=False)
    discount_id = Column(Integer, ForeignKey("fee_discounts.id"), nullable=True)
    additional_fee = Column(Numeric(10,2), nullable=True)
    total_amount = Column(Numeric(10,2), nullable=False)
    final_amount = Column(Numeric(10,2), nullable=False)
    status = Column(String(20), nullable=False, default="Pending")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    # Relationships
    student = relationship("Student", back_populates="assignments")
    details = relationship("StudentFeeDetail", back_populates="assignment")
    installments = relationship("StudentFeeInstallment", back_populates="assignment")

class StudentFeeDetail(Base):
    __tablename__ = "student_fee_details"
    id = Column(Integer, primary_key=True, autoincrement=True)
    assignment_id = Column(Integer, ForeignKey("student_fee_assignments.id"), nullable=False)
    category = Column(String(100), nullable=False)
    amount = Column(Numeric(10,2), nullable=False)
    discount_applied = Column(Numeric(10,2), nullable=True)
    final_amount = Column(Numeric(10,2), nullable=False)
    # Relationship
    assignment = relationship("StudentFeeAssignment", back_populates="details")

class StudentFeeInstallment(Base):
    __tablename__ = "student_fee_installments"
    id = Column(Integer, primary_key=True, autoincrement=True)
    assignment_id = Column(Integer, ForeignKey("student_fee_assignments.id"), nullable=False)
    installment_no = Column(Integer, nullable=False)
    due_date = Column(Date, nullable=False)
    amount = Column(Numeric(10,2), nullable=False)
    status = Column(String(20), nullable=False, default="Pending")
    # Relationship
    assignment = relationship("StudentFeeAssignment", back_populates="installments")
