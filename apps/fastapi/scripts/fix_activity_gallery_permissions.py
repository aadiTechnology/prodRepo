"""
Grant tenant ADMIN roles access to ACTIVITY_GALLERY_MGMT menus (Photo / Video Gallery).

Fixes the case where the menu appears in Permission Mapping but ProtectedRoute
requires ACTIVITY_GALLERY_MGMT:view from RoleMenuPermission rows.

Usage (from apps/fastapi):
    python scripts/fix_activity_gallery_permissions.py --dry-run
    python scripts/fix_activity_gallery_permissions.py
    python scripts/fix_activity_gallery_permissions.py --tenant-id 20
"""
from __future__ import annotations

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import insert

from app.core.database import SessionLocal
from app.models.feature import Feature
from app.models.menu import Menu
from app.models.role import Role, role_menus
from app.models.role_menu_permission import RoleMenuPermission
from app.models.user import User
from app.services import rbac_service

FEATURE_CODE = "ACTIVITY_GALLERY_MGMT"
GALLERY_PATH = "/activity-management/photo-video-gallery"


def _gallery_menus(db) -> list[Menu]:
    feature = (
        db.query(Feature)
        .filter(
            Feature.code == FEATURE_CODE,
            Feature.is_active == True,  # noqa: E712
            Feature.is_deleted == False,  # noqa: E712
        )
        .first()
    )
    if not feature:
        raise SystemExit(f"Feature {FEATURE_CODE!r} not found in database.")

    menus = (
        db.query(Menu)
        .filter(
            Menu.feature_id == feature.id,
            Menu.is_active == True,  # noqa: E712
            Menu.is_deleted == False,  # noqa: E712
        )
        .order_by(Menu.id)
        .all()
    )
    if not menus:
        raise SystemExit(f"No active menus linked to {FEATURE_CODE!r}.")

    path_matches = [m for m in menus if (m.path or "").strip() == GALLERY_PATH]
    return path_matches or menus


def _tenant_admin_roles(db, tenant_id: int | None) -> list[Role]:
    query = db.query(Role).filter(
        Role.code == "ADMIN",
        Role.tenant_id.isnot(None),
        Role.is_deleted == False,  # noqa: E712
        Role.is_active == True,  # noqa: E712
    )
    if tenant_id is not None:
        query = query.filter(Role.tenant_id == tenant_id)
    return query.order_by(Role.tenant_id, Role.id).all()


def fix_activity_gallery_permissions(
    db,
    *,
    tenant_id: int | None = None,
    dry_run: bool = False,
) -> tuple[int, int, int]:
    menus = _gallery_menus(db)
    menu_ids = [int(m.id) for m in menus]  # type: ignore[arg-type]
    admin_roles = _tenant_admin_roles(db, tenant_id)

    if not admin_roles:
        print("No tenant ADMIN roles matched.")
        return (0, 0, 0)

    print("ACTIVITY_GALLERY_MGMT menus to grant:")
    for m in menus:
        print(f"  id={m.id} name={m.name!r} path={m.path!r}")

    roles_updated = 0
    rm_inserts = 0
    rmp_inserts = 0

    for role in admin_roles:
        role_changed = False
        existing_rm = {
            r[0]
            for r in db.query(role_menus.c.menu_id).filter(role_menus.c.role_id == role.id).all()
        }
        existing_rmp = {
            r[0]
            for r in db.query(RoleMenuPermission.menu_id)
            .filter(RoleMenuPermission.role_id == role.id)
            .all()
        }

        for mid in menu_ids:
            if mid not in existing_rm:
                if dry_run:
                    print(
                        f"[dry-run] role_menus: tenant_id={role.tenant_id} "
                        f"role_id={role.id} menu_id={mid}"
                    )
                else:
                    db.execute(insert(role_menus), [{"role_id": role.id, "menu_id": mid}])
                rm_inserts += 1
                role_changed = True

            if mid not in existing_rmp:
                if dry_run:
                    print(
                        f"[dry-run] RoleMenuPermission: tenant_id={role.tenant_id} "
                        f"role_id={role.id} menu_id={mid} (view/create/edit/delete=True)"
                    )
                else:
                    db.add(
                        RoleMenuPermission(
                            role_id=role.id,
                            tenant_id=role.tenant_id,
                            menu_id=mid,
                            can_view=True,
                            can_create=True,
                            can_edit=True,
                            can_delete=True,
                        )
                    )
                rmp_inserts += 1
                role_changed = True

        if role_changed:
            roles_updated += 1

    if not dry_run and (rm_inserts or rmp_inserts):
        db.commit()

    return roles_updated, rm_inserts, rmp_inserts


def verify(db, tenant_id: int | None, email: str | None) -> None:
    print("\n=== Verification ===")
    menus = _gallery_menus(db)
    for m in menus:
        print(f"Menu id={m.id} name={m.name!r} path={m.path!r}")

    roles = _tenant_admin_roles(db, tenant_id)
    for role in roles[:5]:
        rmp = (
            db.query(RoleMenuPermission)
            .filter(
                RoleMenuPermission.role_id == role.id,
                RoleMenuPermission.menu_id.in_([int(m.id) for m in menus]),  # type: ignore[arg-type]
            )
            .all()
        )
        print(
            f"Tenant {role.tenant_id} ADMIN role_id={role.id}: "
            f"{len(rmp)} RoleMenuPermission row(s) on gallery menus"
        )

    user_query = db.query(User).filter(
        User.is_deleted == False,  # noqa: E712
        User.is_active == True,  # noqa: E712
        User.tenant_id.isnot(None),
    )
    if tenant_id is not None:
        user_query = user_query.filter(User.tenant_id == tenant_id)
    if email:
        user_query = user_query.filter(User.email == email.lower())

    for user in user_query.limit(3).all():
        perms, menu_tree = rbac_service.resolve_user_permissions_and_menus(db, user)
        gallery_perms = sorted(p for p in perms if p.startswith(f"{FEATURE_CODE}:"))
        gallery_in_menu = False
        for node in menu_tree:
            children = getattr(node, "children", None) or []
            for child in children:
                if (getattr(child, "path", None) or "") == GALLERY_PATH:
                    gallery_in_menu = True
        print(f"\nUser {user.email} (tenant_id={user.tenant_id}):")
        print(f"  {FEATURE_CODE} permissions: {gallery_perms or '(none)'}")
        print(f"  Gallery in menu tree: {gallery_in_menu}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Grant tenant ADMIN roles ACTIVITY_GALLERY_MGMT menu permissions."
    )
    parser.add_argument("--tenant-id", type=int, default=None)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--verify-email", type=str, default=None)
    parser.add_argument("--verify-only", action="store_true")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        if not args.verify_only:
            roles_updated, rm_inserts, rmp_inserts = fix_activity_gallery_permissions(
                db,
                tenant_id=args.tenant_id,
                dry_run=args.dry_run,
            )
            prefix = "[dry-run] " if args.dry_run else ""
            print(
                f"\n{prefix}Done: {roles_updated} ADMIN role(s) updated, "
                f"role_menus +{rm_inserts}, RoleMenuPermission +{rmp_inserts}."
            )
        verify(db, args.tenant_id, args.verify_email)
    finally:
        db.close()


if __name__ == "__main__":
    main()
