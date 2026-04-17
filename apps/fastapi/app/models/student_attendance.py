from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base

class StudentAttendance(Base):
    __tablename__ = "student_attendance"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="NO ACTION"), nullable=False)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id", ondelete="NO ACTION"), nullable=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="NO ACTION"), nullable=False)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="NO ACTION"), nullable=True)
    class_division_id = Column(Integer, ForeignKey("class_divisions.id", ondelete="NO ACTION"), nullable=True)
    
    attendance_date = Column(Date, nullable=False)
    status = Column(String(20), nullable=False) # 'Present', 'Absent', 'Half Day', 'Leave'
    remarks = Column(String(500), nullable=True)

    # Audit fields
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=True)
    is_deleted = Column(Boolean, default=False, nullable=False)

    # Relationships
    student = relationship("Student", foreign_keys=[student_id])
    academic_year = relationship("AcademicYear", foreign_keys=[academic_year_id])
    class_model = relationship("SchoolClass", foreign_keys=[class_id])
    division = relationship("ClassDivision", foreign_keys=[class_division_id])

    __table_args__ = (
        UniqueConstraint('student_id', 'attendance_date', name='uq_student_attendance_date'),
    )
