"""
Repair tenant admin menu access:
  1) Backfill RoleMenuPermission from role_menus (provisioning used to only set role_menus).
  2) Attach any new global catalog menus to tenant ADMIN roles (e.g. after seed_rbac adds reports).

Run from apps/fastapi (after seed_rbac.py if you added new menu rows):
    python scripts/backfill_role_menu_permissions.py
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
        rm, rmp = rbac_service.sync_global_menus_to_tenant_admin_roles(db)
        print(f"Backfill: inserted {n} RoleMenuPermission row(s) from existing role_menus.")
        print(f"Sync: role_menus +{rm}, RoleMenuPermission +{rmp} for global menus on tenant ADMIN roles.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
