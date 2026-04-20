import sys
import os

# Add the app directory to sys.path to allow imports
sys.path.append(os.path.join(os.getcwd(), "apps", "fastapi"))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.teacher import Teacher
from app.models.user import User
from app.schemas.user import UserCreate
from app.services import user_service, teacher_service
from app.core.logging_config import setup_logging, get_logger

setup_logging()
logger = get_logger(__name__)

def migrate_teachers():
    db: Session = SessionLocal()
    try:
        # Fetch teachers without a linked user_id
        teachers = db.query(Teacher).filter(
            Teacher.user_id == None,
            Teacher.is_deleted == False
        ).all()
        
        logger.info(f"Found {len(teachers)} teachers to migrate.")
        
        migrated_count = 0
        for teacher in teachers:
            if not teacher.email:
                logger.warning(f"Teacher {teacher.full_name} (id={teacher.id}) has no email. Skipping.")
                continue
                
            logger.info(f"Migrating teacher: {teacher.full_name} ({teacher.email})")
            
            # Check if user already exists
            existing_user = user_service.get_user_by_email(db, teacher.email)
            if existing_user:
                logger.info(f"Existing user found for {teacher.email}. Linking...")
                teacher.user_id = existing_user.id
            else:
                # Create new user
                user_data = UserCreate(
                    email=teacher.email,
                    full_name=teacher.full_name,
                    password="Teacher@123",
                    role="TEACHER",
                    tenant_id=teacher.tenant_id
                )
                try:
                    new_user = user_service.create_user(
                        db, 
                        user_data, 
                        created_by=teacher.created_by, 
                        tenant_id=teacher.tenant_id
                    )
                    teacher.user_id = new_user.id
                    logger.info(f"Created new user for {teacher.email}")
                except Exception as e:
                    logger.error(f"Failed to create user for {teacher.email}: {str(e)}")
                    continue
            
            migrated_count += 1
            
        db.commit()
        logger.info(f"Successfully migrated {migrated_count} teachers.")
        
    except Exception as e:
        db.rollback()
        logger.error(f"Migration failed: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    migrate_teachers()
