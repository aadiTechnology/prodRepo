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
    gender = Column(String(10), nullable=True)
    date_of_birth = Column(String(20), nullable=True)
    mobile_number = Column(String(20), nullable=True, index=True)
    email = Column(String(100), nullable=True)
    parent_name = Column(String(150), nullable=True)
    admission_no = Column(String(50), nullable=True)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)

    # Relationships
    class_model = relationship(
        "SchoolClass",
        back_populates="students",
        lazy="joined",
        foreign_keys=[class_id],
    )
    fee_ledgers = relationship("FeeLedger", back_populates="student")
    assignments = relationship("StudentFeeAssignment", back_populates="student")

