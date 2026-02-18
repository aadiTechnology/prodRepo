from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from app.core.database import Base


class UserProfile(Base):
    """
    Profile information for users, stored separately to maintain
    cleanliness of the core users table and allow for role-agnostic profile extensions.
    
    Maps to the existing 'UserProfile' table in the database (created manually in SSMS).
    Column names match the DB schema: UserId, ProfileImagePath.
    """
    __tablename__ = "UserProfile"

    # Match exact column names from the DB (PascalCase as created in SSMS)
    UserId = Column("UserId", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    ProfileImagePath = Column("ProfileImagePath", String(500), nullable=True)
