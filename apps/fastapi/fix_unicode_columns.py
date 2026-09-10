#!/usr/bin/env python3
"""
Fix Unicode columns for Hindi support in activity gallery
Run this script to convert gallery_name and related columns to NVARCHAR
"""

from app.core.database import engine
import sqlalchemy as sa

def fix_unicode_columns():
    with engine.begin() as conn:
        try:
            # Convert gallery_name to NVARCHAR
            print("Converting activity_gallery.gallery_name to NVARCHAR(255)...")
            conn.execute(sa.text(
                "ALTER TABLE activity_gallery ALTER COLUMN gallery_name NVARCHAR(255) NOT NULL"
            ))
            print("✓ gallery_name converted")
            
            # Convert description to NVARCHAR(MAX)
            print("Converting activity_gallery.description to NVARCHAR(MAX)...")
            conn.execute(sa.text(
                "ALTER TABLE activity_gallery ALTER COLUMN description NVARCHAR(MAX)"
            ))
            print("✓ description converted")
            
            # Convert file_name to NVARCHAR
            print("Converting activity_gallery_media.file_name to NVARCHAR(255)...")
            conn.execute(sa.text(
                "ALTER TABLE activity_gallery_media ALTER COLUMN file_name NVARCHAR(255) NOT NULL"
            ))
            print("✓ file_name converted")
            
            # Convert original_file_name to NVARCHAR
            print("Converting activity_gallery_media.original_file_name to NVARCHAR(255)...")
            conn.execute(sa.text(
                "ALTER TABLE activity_gallery_media ALTER COLUMN original_file_name NVARCHAR(255)"
            ))
            print("✓ original_file_name converted")
            
            print("\n✅ All columns successfully converted to Unicode (NVARCHAR) for Hindi support!")
            
        except Exception as e:
            print(f"❌ Error: {e}")
            raise

if __name__ == "__main__":
    fix_unicode_columns()
