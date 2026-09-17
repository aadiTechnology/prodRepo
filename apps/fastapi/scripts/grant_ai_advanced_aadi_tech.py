"""Grant AI Advanced (LLM) to Teacher roles for Aadi Tech so Campus Buddy can use the API key."""
from __future__ import annotations

import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from dotenv import load_dotenv

load_dotenv(os.getenv("ENV_FILE", ".env"))

from sqlalchemy import or_
from app.core.database import SessionLocal
from app.models.menu import Menu
from app.models.role import Role
from app.models.role_menu_permission import RoleMenuPermission
from app.models.tenant import Tenant
from app.models.user import User
from app.services.ai_permission_sync_service import (
    AI_ADVANCED_PATH,
    sync_ai_tenant_plan_from_permissions,
    user_has_llm_permission,
)


def _advanced_menus(db):
    return (
        db.query(Menu)
        .filter(
            Menu.is_deleted == False,  # noqa: E712
            or_(Menu.path == AI_ADVANCED_PATH, Menu.name.ilike("%AI Advanced%")),
        )
        .all()
    )


def main() -> int:
    db = SessionLocal()
    try:
        menus = _advanced_menus(db)
        if not menus:
            print("FAIL: AI Advanced menu is missing. Add it in Permission Management first.")
            return 1
        print("AI Advanced menus:", [(m.id, m.name, m.path) for m in menus])

        tenants = (
            db.query(Tenant)
            .filter(or_(Tenant.name.ilike("%Aadi%"), Tenant.code.ilike("%Aadi%")))
            .all()
        )
        if not tenants:
            print("No Aadi tenant found; listing first 15 tenants:")
            for t in db.query(Tenant).limit(15).all():
                print(f"  id={t.id} code={t.code} name={t.name}")
            return 1

        for tenant in tenants:
            print(f"\nTenant id={tenant.id} name={tenant.name} code={tenant.code}")
            roles = (
                db.query(Role)
                .filter(
                    Role.tenant_id == tenant.id,
                    Role.is_deleted == False,  # noqa: E712
                    or_(Role.name.ilike("%teacher%"), Role.name.ilike("%admin%")),
                )
                .all()
            )
            for role in roles:
                for menu in menus:
                    existing = (
                        db.query(RoleMenuPermission)
                        .filter(
                            RoleMenuPermission.role_id == role.id,
                            RoleMenuPermission.menu_id == menu.id,
                        )
                        .first()
                    )
                    if existing:
                        if not existing.can_view:
                            existing.can_view = True
                            print(f"  Updated can_view on {role.name} -> {menu.name}")
                        else:
                            print(f"  Already granted: {role.name} -> {menu.name}")
                        continue
                    db.add(
                        RoleMenuPermission(
                            tenant_id=tenant.id,
                            role_id=role.id,
                            menu_id=menu.id,
                            can_view=True,
                            can_create=False,
                            can_edit=False,
                            can_delete=False,
                        )
                    )
                    print(f"  Granted {role.name} -> {menu.name}")
            db.commit()
            sync_ai_tenant_plan_from_permissions(db, tenant.id)

            users = (
                db.query(User)
                .filter(User.tenant_id == tenant.id, User.full_name.ilike("%Sakshi%"))
                .all()
            )
            for user in users:
                print(
                    f"  Sakshi user id={user.id} email={user.email} "
                    f"llm={user_has_llm_permission(db, user)}"
                )
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
