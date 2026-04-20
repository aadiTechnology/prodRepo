from datetime import datetime
from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, String, Boolean
from sqlalchemy.orm import relationship

from app.core.database import Base

class Teacher(Base):
    """Teacher model for managing school teaching staff."""
    __tablename__ = "teachers"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    
    teacher_code = Column(String(50), nullable=True) # E.g., T001
    full_name = Column(String(200), nullable=False)
    
    date_of_birth = Column(Date, nullable=True)
    gender = Column(String(10), nullable=True)
    
    mobile_number = Column(String(15), nullable=False)
    email = Column(String(100), nullable=True)
    
    qualification = Column(String(200), nullable=True)
    experience_years = Column(Integer, nullable=True)
    
    photo_url = Column(String(None), nullable=True) # MAX string
    
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="SET NULL"), nullable=True)
    class_division_id = Column(Integer, ForeignKey("class_divisions.id", ondelete="SET NULL"), nullable=True)
    
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    is_active = Column(Boolean, default=True, nullable=False)
    
    # Address Details
    address = Column(String(500), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    pincode = Column(String(10), nullable=True)
    
    # Audit fields
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_by = Column(Integer, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)
    updated_by = Column(Integer, nullable=True)
    
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(Integer, nullable=True)

    # Relationships
    tenant = relationship("Tenant")
    user = relationship("User")
    class_model = relationship(
        "SchoolClass",
        foreign_keys=[class_id],
        lazy="joined"
    )
    division = relationship(
        "ClassDivision",
        foreign_keys=[class_division_id],
        lazy="joined"
    )
