import sys
import os
from dotenv import load_dotenv

# Load environment variables from .env file
env_path = os.path.join(os.getcwd(), "apps", "fastapi", ".env")
load_dotenv(dotenv_path=env_path)

# Add the app directory to sys.path to allow imports
sys.path.append(os.path.join(os.getcwd(), "apps", "fastapi"))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.teacher import Teacher
from app.models.user import User
from app.core.logging_config import setup_logging, get_logger

setup_logging()
logger = get_logger(__name__)

def repair_teacher_links():
    db: Session = SessionLocal()
    try:
        # Fetch all teachers
        teachers = db.query(Teacher).filter(Teacher.is_deleted == False).all()
        
        logger.info(f"Checking {len(teachers)} teachers for link repairs...")
        
        repaired_count = 0
        for teacher in teachers:
            # Look for a user with the same name
            # We use name because emails are currently swapped in the user's DB
            matching_user = db.query(User).filter(
                User.full_name == teacher.full_name,
                User.role == "TEACHER",
                User.is_deleted == False
            ).first()
            
            if matching_user:
                needs_update = False
                
                # Check if user_id is missing or wrong
                if teacher.user_id != matching_user.id:
                    logger.info(f"Updating user_id for {teacher.full_name}: {teacher.user_id} -> {matching_user.id}")
                    teacher.user_id = matching_user.id
                    needs_update = True
                
                # Check if email is wrong (matches the user's record)
                if teacher.email != matching_user.email:
                    logger.info(f"Updating email for {teacher.full_name}: {teacher.email} -> {matching_user.email}")
                    teacher.email = matching_user.email
                    needs_update = True
                
                if needs_update:
                    repaired_count += 1
            else:
                logger.warning(f"No matching user found for teacher: {teacher.full_name}")
            
        if repaired_count > 0:
            db.commit()
            logger.info(f"Successfully repaired {repaired_count} teacher links.")
        else:
            logger.info("No repairs needed.")
            
    except Exception as e:
        db.rollback()
        logger.error(f"Repair failed: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    repair_teacher_links()
