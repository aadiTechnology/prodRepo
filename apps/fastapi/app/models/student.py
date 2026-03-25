from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Boolean, Numeric
from sqlalchemy.orm import relationship

from app.core.database import Base


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)

    student_name = Column(String(150), nullable=False)
    student_code = Column(String(50), nullable=True)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="SET NULL"), nullable=True)
    roll_no = Column(String(20), nullable=True)
    parent_name = Column(String(150), nullable=True)
    academic_year = Column(String(20), nullable=True)  # legacy string
    admission_no = Column(String(50), nullable=True)
    fee_structure_id = Column(Integer, nullable=True)  # Added for unique fee structure per student
    is_active = Column(Boolean, default=True)

    # Relationships
    class_model = relationship(
        "SchoolClass",
        back_populates="students",
        lazy="joined",
        foreign_keys=[class_id],
    )
    fee_ledgers = relationship("FeeLedger", back_populates="student")
    assignments = relationship("StudentFeeAssignment", back_populates="student")

