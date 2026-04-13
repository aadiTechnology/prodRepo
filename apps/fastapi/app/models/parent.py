from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.core.database import Base

class Parent(Base):
    __tablename__ = "parents"

    id = Column(Integer, primary_key=True, index=True)
    parent_name = Column(String(150), nullable=False)
    mobile_number = Column(String(20), nullable=False, unique=True, index=True)
    tenant_id = Column(Integer, nullable=False)

    # Reverse relationship to Student
    students = relationship("Student", back_populates="parent")
