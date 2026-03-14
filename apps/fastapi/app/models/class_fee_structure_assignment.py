from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Enum,
    Date,
)
from sqlalchemy.orm import relationship

from app.core.database import Base

class AssignmentStatus(str, Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


# Use the existing SQL Server table name
class ClassFeeStructureAssignment(Base):
    __tablename__ = "class_fee_assignments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    academic_year = Column(String(20), nullable=False)
    class_id = Column("class_id", Integer, nullable=False)
    fee_structure_id = Column("fee_structure_id", Integer, nullable=False)
    effective_date = Column(Date, nullable=False)
    status = Column(String(50), nullable=False)
    created_by = Column(Integer, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        # Unique constraint: one active assignment per class per academic year
        {'sqlite_autoincrement': True},
    )
