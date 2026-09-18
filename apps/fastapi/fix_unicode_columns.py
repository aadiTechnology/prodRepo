#!/usr/bin/env python3
"""
Fix Unicode columns for Hindi support in activity gallery.
Safe to re-run: skips columns that are already NVARCHAR.
"""

from app.core.database import engine
from app.repositories.activity_gallery_repository import ensure_unicode_columns


def fix_unicode_columns():
    try:
        ensure_unicode_columns(engine)
        print("Activity gallery text columns are NVARCHAR (Hindi-safe).")
    except Exception as e:
        print(f"Error: {e}")
        raise


if __name__ == "__main__":
    fix_unicode_columns()
