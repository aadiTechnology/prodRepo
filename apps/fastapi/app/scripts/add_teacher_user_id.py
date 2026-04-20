import sys
import os

# Add the app directory to sys.path
sys.path.append(os.path.join(os.getcwd(), "apps", "fastapi"))

from sqlalchemy import text
from app.core.database import engine

def add_column():
    try:
        with engine.connect() as conn:
            # Check if column exists first (optional but safer)
            result = conn.execute(text("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'teachers' AND COLUMN_NAME = 'user_id'")).fetchone()
            if result:
                print("Column user_id already exists.")
                return

            print("Adding user_id column to teachers table...")
            conn.execute(text("ALTER TABLE teachers ADD user_id INT NULL"))
            conn.execute(text("ALTER TABLE teachers ADD CONSTRAINT FK_Teachers_Users FOREIGN KEY (user_id) REFERENCES users(id)"))
            conn.commit()
            print("Column and FK added successfully.")
    except Exception as e:
        print(f"Error adding column: {str(e)}")

if __name__ == "__main__":
    add_column()
