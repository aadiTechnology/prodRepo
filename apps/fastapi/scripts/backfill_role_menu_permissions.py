"""
Repair tenant admin menu access:
  Backfill RoleMenuPermission from role_menus (legacy rows missing granular permissions).

Run from apps/fastapi:
    python scripts/backfill_role_menu_permissions.py

Note: Does NOT auto-assign new catalog menus to tenant ADMIN roles.
      Use Permission Management to assign permissions manually.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.services import rbac_service


def main() -> None:
    db = SessionLocal()
    try:
        n = rbac_service.backfill_role_menu_permissions_from_role_menus(db)
        print(f"Backfill: inserted {n} RoleMenuPermission row(s) from existing role_menus.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
