from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class UserProfile(Base):
    """
    Profile information for users, stored separately to maintain
    cleanliness of the core users table and allow for role-agnostic profile extensions.
    
    Maps to the existing 'UserProfile' table in the database.
    Foreign key properly references User model.
    """
    __tablename__ = "UserProfile"

    UserId = Column(
        "UserId", 
        Integer, 
        ForeignKey("users.id", ondelete="CASCADE"), 
        primary_key=True
    )
    ProfileImagePath = Column("ProfileImagePath", String(500), nullable=True)
    
    # Relationship back to User
    user = relationship("User", foreign_keys=[UserId])
