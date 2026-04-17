import sys
import os

# Add apps/fastapi to sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

from app.core.database import engine, Base
from app.models.student_attendance import StudentAttendance
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_table():
    try:
        logger.info("Creating student_attendance table...")
        # Only create the specific table
        StudentAttendance.__table__.create(engine, checkfirst=True)
        logger.info("Successfully created student_attendance table.")
    except Exception as e:
        logger.error(f"Error creating table: {e}")
        sys.exit(1)

if __name__ == "__main__":
    create_table()
