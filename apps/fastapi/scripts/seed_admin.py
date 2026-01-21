"""
Database seeding script to create an initial admin user.

Usage:
    python -m app.scripts.seed_admin
    OR
    python scripts/seed_admin.py
"""
import sys
import os

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.user import User, UserRole
from app.services import user_service
from app.schemas.user import UserCreate
from app.core.logging_config import get_logger

logger = get_logger(__name__)

def create_admin_user(email: str, full_name: str, password: str) -> None:
    """Create an admin user in the database."""
    db: Session = SessionLocal()
    try:
        # Check if user already exists
        existing_user = user_service.get_user_by_email(db, email)
        if existing_user:
            logger.warning(f"User with email {email} already exists")
            print(f"❌ User with email {email} already exists")
            return
        
        # Check if any admin users exist
        existing_admins = db.query(User).filter(User.role == UserRole.ADMIN).all()
        if existing_admins:
            logger.info(f"Admin users already exist. Creating regular user: {email}")
            print(f"ℹ️  Admin users already exist. Creating user: {email}")
            user_data = UserCreate(email=email, full_name=full_name, password=password)
            created_user = user_service.create_user(db, user_data, role=UserRole.USER)
        else:
            logger.info(f"Creating first admin user: {email}")
            print(f"✅ Creating admin user: {email}")
            user_data = UserCreate(email=email, full_name=full_name, password=password)
            created_user = user_service.create_user(db, user_data, role=UserRole.ADMIN)
        
        print(f"✅ User created successfully!")
        print(f"   Email: {created_user.email}")
        print(f"   Full Name: {created_user.full_name}")
        print(f"   Role: {created_user.role.value}")
        
    except Exception as e:
        logger.error(f"Error creating user: {str(e)}")
        print(f"❌ Error creating user: {str(e)}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    import getpass
    
    print("=" * 50)
    print("Admin User Creation Script")
    print("=" * 50)
    print()
    
    email = input("Enter email: ").strip()
    if not email:
        print("❌ Email is required")
        sys.exit(1)
    
    full_name = input("Enter full name: ").strip()
    if not full_name:
        print("❌ Full name is required")
        sys.exit(1)
    
    password = getpass.getpass("Enter password: ").strip()
    if not password:
        print("❌ Password is required")
        sys.exit(1)
    
    password_confirm = getpass.getpass("Confirm password: ").strip()
    if password != password_confirm:
        print("❌ Passwords do not match")
        sys.exit(1)
    
    print()
    create_admin_user(email, full_name, password)
