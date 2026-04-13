from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Boolean
from sqlalchemy.orm import relationship
from app.models.lead import LeadParent
from app.core.database import Base

class Student(Base):
    __tablename__ = "students"
    student_code = Column(String(50), nullable=True)
    roll_no = Column(String(20), nullable=True)
    gender = Column(String(10), nullable=True)
    date_of_birth = Column(String(20), nullable=True)
    mobile_number = Column(String(20), nullable=True, index=True)
    email = Column(String(100), nullable=True)
    parent_name = Column(String(150), nullable=True)
    admission_no = Column(String(50), nullable=True)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id", ondelete="SET NULL"), nullable=True)
    class_division_id = Column(Integer, ForeignKey("class_divisions.id", ondelete="SET NULL"), nullable=True)
    fee_structure_id = Column(Integer, ForeignKey("fee_structures.id", ondelete="SET NULL"), nullable=True)
    address = Column(String(200), nullable=True)
    area = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    pincode = Column(String(20), nullable=True)

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    tenant_id = Column(Integer, nullable=False, default=1)
    student_name = Column(String(150), nullable=False)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="SET NULL"), nullable=True)
    parent_id = Column(Integer, ForeignKey("parents.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)

    # Relationship to Parent
    parent = relationship("LeadParent", back_populates="students")

    # Other relationships (unchanged)
    class_model = relationship(
        "SchoolClass",
        back_populates="students",
        lazy="joined",
        foreign_keys=[class_id],
    )
    fee_ledgers = relationship("FeeLedger", back_populates="student")
    assignments = relationship("StudentFeeAssignment", back_populates="student")

