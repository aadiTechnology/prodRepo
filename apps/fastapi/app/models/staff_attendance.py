from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)

from app.core.database import Base


class StaffAttendance(Base):
    __tablename__ = "staff_attendance"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="NO ACTION"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("teachers.id", ondelete="NO ACTION"), nullable=False)
    attendance_date = Column(Date, nullable=False)
    status = Column(String(20), nullable=False)
    check_in_time = Column(String(5), nullable=True)
    check_out_time = Column(String(5), nullable=True)
    remarks = Column(String(50), nullable=True)
    working_hours_minutes = Column(Integer, nullable=True)
    overtime_minutes = Column(Integer, nullable=True)
    is_submitted = Column(Boolean, nullable=False, default=False)
    approval_status = Column(String(30), nullable=False, default="Waiting for Approval")
    rejection_reason = Column(String(500), nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=True)
    updated_at = Column(DateTime, nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=True)
    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=True)

    __table_args__ = (
        UniqueConstraint(
            "tenant_id",
            "teacher_id",
            "attendance_date",
            name="UQ_staff_attendance_tenant_teacher_date",
        ),
    )
