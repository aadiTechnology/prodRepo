"""
Inspect the RBAC permission flow so we can deliver the AI Assistant as a
MODULE/PAGE through the Permission Management screen
(web/src/pages/admin/PermissionManagementPage.tsx).

Flow this app uses (menu-based RBAC):
    System Admin (tenant_id IS NULL)
        -> creates menus/modules  (dbo.menus, level 1 = module, level 2 = page)
        -> grants them to a tenant's roles via dbo.role_menu_permissions
    Tenant Admin (role scope = Tenant)
        -> can only assign menus they themselves were granted
        -> assigns to roles (Teacher/Student/etc.) under their tenant

Goal: represent
    AI_ASSISTANT           -> Campus Buddy (basic: typeahead + navigate)
    AI_ASSISTANT_ADVANCED  -> LLM / advanced tier
as menus (+ optional features) so they can be granted per role/tenant from
the SAME Permission Management UI.

This script is READ-ONLY. It prints:
  1. The system admin user + tenants
  2. menus table shape (modules vs pages, is any AI menu present?)
  3. features table (is there an AI feature/code?)
  4. roles per tenant (Platform vs Tenant scope) + tenant admin roles
  5. role_menu_permissions sample (how grants look)
  6. Whether AI_ASSISTANT menus/features already exist
  7. Ready-to-run SQL template to add the AI modules to Permission Management

Usage (from apps/fastapi):
    python scripts/inspect_ai_permission_flow.py
    python scripts/inspect_ai_permission_flow.py --admin-email sysadmin@server2.com
    python scripts/inspect_ai_permission_flow.py --tenant-id 20
"""
from __future__ import annotations

import argparse
import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from dotenv import load_dotenv

load_dotenv(os.getenv("ENV_FILE", ".env"))

from sqlalchemy import text
from app.core.config import settings
from app.core.database import SessionLocal

DEFAULT_ADMIN_EMAIL = "sysadmin@server2.com"

# Proposed AI menus (level 1 = module hub, level 2 = pages under it).
AI_MODULE_NAME = "AI Assistant"
AI_MODULE_MARKERS = ("ai assistant", "campus buddy", "ai_assistant", "ai navigation")


def _section(title: str) -> None:
    print(f"\n{'-' * 66}")
    print(title)
    print("-" * 66)


def _header(title: str) -> None:
    print(f"\n{'=' * 66}")
    print(title)
    print("=" * 66)


def _table_exists(db, table: str) -> bool:
    row = db.execute(
        text(
            "SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id "
            "WHERE s.name='dbo' AND t.name=:t"
        ),
        {"t": table},
    ).first()
    return row is not None


def _cols(db, table: str) -> set[str]:
    rows = db.execute(
        text(
            "SELECT c.name FROM sys.columns c JOIN sys.tables t ON c.object_id=t.object_id "
            "JOIN sys.schemas s ON t.schema_id=s.schema_id WHERE s.name='dbo' AND t.name=:t"
        ),
        {"t": table},
    ).fetchall()
    return {r[0].lower() for r in rows}


def show_admin_and_tenants(db, admin_email: str) -> None:
    _section(f"1. System admin + tenants")
    admin = db.execute(
        text(
            "SELECT id, email, full_name, role, tenant_id, is_active "
            "FROM dbo.users WHERE email=:e"
        ),
        {"e": admin_email},
    ).first()
    if admin:
        scope = "SYSTEM ADMIN (tenant_id NULL)" if admin[4] is None else f"tenant {admin[4]}"
        print(f"  User: id={admin[0]} {admin[1]} ({admin[2]})")
        print(f"        role={admin[3]} | {scope} | active={admin[5]}")
        if admin[4] is not None:
            print("  NOTE: This user has a tenant_id — a true SYSTEM admin usually has tenant_id = NULL.")
    else:
        print(f"  Admin '{admin_email}' not found. Pass --admin-email <email>.")

    tenants = db.execute(
        text("SELECT id, code, name, is_active FROM dbo.tenants ORDER BY id")
    ).fetchall()
    print(f"\n  Tenants ({len(tenants)}):")
    for t in tenants:
        print(f"    {t[0]:>3}  {t[1]:<16} {t[2]:<28} active={t[3]}")


def show_menu_shape(db) -> None:
    _section("2. menus table (modules = level 1, pages = level 2)")
    if not _table_exists(db, "menus"):
        print("  MISS dbo.menus not found")
        return
    counts = db.execute(
        text(
            "SELECT level, COUNT(*) FROM dbo.menus "
            "WHERE is_deleted=0 GROUP BY level ORDER BY level"
        )
    ).fetchall()
    for lvl, cnt in counts:
        label = "modules (hubs)" if lvl == 1 else "pages" if lvl == 2 else f"level {lvl}"
        print(f"  level {lvl}: {cnt} {label}")

    print("\n  Sample level-1 modules (what appears as a MODULE row in Permission Mgmt):")
    mods = db.execute(
        text(
            "SELECT TOP 12 id, name, path, feature_id, tenant_id FROM dbo.menus "
            "WHERE level=1 AND is_deleted=0 ORDER BY sort_order, name"
        )
    ).fetchall()
    for m in mods:
        scope = "global" if m[4] is None else f"tenant {m[4]}"
        print(f"    id={m[0]:>4} {m[1]:<26} path={m[2] or '-':<22} feature_id={m[3]} [{scope}]")


def show_features(db) -> None:
    _section("3. features table (optional feature code per menu)")
    if not _table_exists(db, "features"):
        print("  MISS dbo.features not found")
        return
    total = db.execute(text("SELECT COUNT(*) FROM dbo.features WHERE is_deleted=0")).scalar()
    print(f"  {total} feature(s). Sample categories:")
    cats = db.execute(
        text(
            "SELECT TOP 15 code, name, category FROM dbo.features "
            "WHERE is_deleted=0 ORDER BY category, code"
        )
    ).fetchall()
    for c in cats:
        print(f"    {c[0]:<22} {c[1]:<28} cat={c[2]}")


def show_roles(db, tenant_id: int | None) -> None:
    _section("4. roles (Platform scope vs Tenant scope)")
    rows = db.execute(
        text(
            "SELECT id, code, name, scope_type, tenant_id, is_system "
            "FROM dbo.roles WHERE is_deleted=0 "
            + ("AND (tenant_id=:tid OR tenant_id IS NULL) " if tenant_id else "")
            + "ORDER BY scope_type, tenant_id, name"
        ),
        {"tid": tenant_id} if tenant_id else {},
    ).fetchall()
    for r in rows:
        scope = "global" if r[4] is None else f"tenant {r[4]}"
        print(f"    id={r[0]:>4} {r[2]:<24} scope={r[3]:<9} {scope:<12} system={r[5]}")


def show_grants_sample(db, tenant_id: int | None) -> None:
    _section("5. role_menu_permissions (how a grant looks)")
    if not _table_exists(db, "role_menu_permissions"):
        print("  MISS dbo.role_menu_permissions not found")
        return
    where = "WHERE 1=1 "
    params: dict = {}
    if tenant_id:
        where += "AND rmp.tenant_id=:tid "
        params["tid"] = tenant_id
    rows = db.execute(
        text(
            "SELECT TOP 12 rmp.role_id, r.name AS role_name, m.name AS menu_name, m.level, "
            "rmp.can_view, rmp.can_create, rmp.can_edit, rmp.can_delete, rmp.tenant_id "
            "FROM dbo.role_menu_permissions rmp "
            "JOIN dbo.roles r ON r.id = rmp.role_id "
            "JOIN dbo.menus m ON m.id = rmp.menu_id "
            + where +
            "ORDER BY rmp.role_id, m.level, m.name"
        ),
        params,
    ).fetchall()
    if not rows:
        print("  (no grants found for this filter)")
        return
    for r in rows:
        flags = "".join([
            "V" if r[4] else "-",
            "C" if r[5] else "-",
            "E" if r[6] else "-",
            "D" if r[7] else "-",
        ])
        print(f"    role {r[0]} ({r[1]:<18}) menu L{r[3]} {r[2]:<26} [{flags}] tenant={r[8]}")


def check_ai_menu(db) -> bool:
    _section("6. Does an AI Assistant module/menu already exist?")
    found = False
    if _table_exists(db, "menus"):
        like = " OR ".join([f"LOWER(name) LIKE :m{i}" for i in range(len(AI_MODULE_MARKERS))])
        params = {f"m{i}": f"%{mk}%" for i, mk in enumerate(AI_MODULE_MARKERS)}
        rows = db.execute(
            text(
                f"SELECT id, name, path, level, feature_id, tenant_id FROM dbo.menus "
                f"WHERE is_deleted=0 AND ({like})"
            ),
            params,
        ).fetchall()
        if rows:
            found = True
            print("  Existing AI menus:")
            for r in rows:
                print(f"    id={r[0]} {r[1]} path={r[2]} level={r[3]} feature_id={r[4]} tenant={r[5]}")
        else:
            print("  No AI Assistant menu found in dbo.menus.")
    if _table_exists(db, "features"):
        frows = db.execute(
            text(
                "SELECT id, code, name FROM dbo.features "
                "WHERE is_deleted=0 AND (LOWER(code) LIKE '%ai%assist%' OR LOWER(name) LIKE '%ai assistant%' "
                "OR LOWER(code) LIKE '%campus%buddy%')"
            )
        ).fetchall()
        if frows:
            print("  Existing AI features:")
            for f in frows:
                print(f"    id={f[0]} code={f[1]} name={f[2]}")
    return found


def print_sql_template(db, tenant_id: int | None) -> None:
    _section("7. SQL template — add AI Assistant to Permission Management")
    print(
        "  Model AI as menus so PermissionManagementPage can grant them.\n"
        "  Level 1 = module 'AI Assistant', Level 2 = the two entitlement pages.\n"
    )
    print("  -- Step A: (optional) features for clean permission codes")
    print("  INSERT INTO dbo.features (code, name, category, is_active, is_deleted, created_at)")
    print("  VALUES ('AI_ASSISTANT', 'AI Assistant (Basic)', 'AI', 1, 0, GETUTCDATE()),")
    print("         ('AI_ASSISTANT_ADVANCED', 'AI Assistant (Advanced/LLM)', 'AI', 1, 0, GETUTCDATE());")
    print()
    print("  -- Step B: level-1 module (global menu; tenant_id NULL = template)")
    print("  INSERT INTO dbo.menus (tenant_id, parent_id, name, path, level, sort_order, is_active, is_deleted, created_at)")
    print("  VALUES (NULL, NULL, 'AI Assistant', NULL, 1, 900, 1, 0, GETUTCDATE());")
    print("  DECLARE @aiModuleId INT = SCOPE_IDENTITY();")
    print()
    print("  -- Step C: level-2 pages under the module")
    print("  INSERT INTO dbo.menus (tenant_id, parent_id, name, path, level, sort_order, is_active, is_deleted, created_at)")
    print("  VALUES (NULL, @aiModuleId, 'Campus Buddy (Basic)', '/ai/basic', 2, 1, 1, 0, GETUTCDATE()),")
    print("         (NULL, @aiModuleId, 'AI Advanced (LLM)',    '/ai/advanced', 2, 2, 1, 0, GETUTCDATE());")
    print()
    print("  -- Step D: grant to a role so it shows in Permission Mgmt for that tenant")
    print("  --   (system admin grants to tenant admin role; tenant admin re-grants to staff)")
    print("  -- INSERT INTO dbo.role_menu_permissions (tenant_id, role_id, menu_id, can_view, can_create, can_edit, can_delete, created_at)")
    print("  -- VALUES (<tenant_id>, <role_id>, <menu_id>, 1, 0, 0, 0, GETUTCDATE());")
    print()
    print("  After inserting, these appear as rows in PermissionManagementPage")
    print("  (module 'AI Assistant' with 2 pages) and can be toggled per role/tenant.")


def print_verdict(ai_exists: bool) -> None:
    _header("VERDICT — can Permission Management deliver AI Basic/Advanced?")
    print("  YES. This app is menu-based RBAC, so the correct way is to add")
    print("  'AI Assistant' as a MENU MODULE with two pages, then grant via")
    print("  PermissionManagementPage (system admin -> tenant admin -> roles).")
    print()
    print("  Two coexisting mechanisms:")
    print("   - Menu/permission (PermissionManagementPage)  -> WHO (role) can use it")
    print("   - ai_assistant_tenant_config / tenant_module  -> plan + caps + BILLING")
    print()
    print("  Recommended: use BOTH.")
    print("   1. Menu 'AI Assistant' + pages -> role-level access via Permission Mgmt")
    print("   2. ai_assistant_tenant_config.llm_enabled -> hard gate + cost control")
    print()
    if ai_exists:
        print("  STATUS: An AI menu/feature already exists — reuse it, don't duplicate.")
    else:
        print("  STATUS: No AI menu yet — run Section 7 SQL to create it.")


def main() -> int:
    parser = argparse.ArgumentParser(description="Inspect RBAC flow for AI Assistant delivery")
    parser.add_argument("--admin-email", default=DEFAULT_ADMIN_EMAIL)
    parser.add_argument("--tenant-id", type=int, default=None, help="Focus a tenant (e.g. 20)")
    args = parser.parse_args()

    _header("AI Assistant via Permission Management - RBAC Inspection")
    print(f"DB: {settings.DB_SERVER}/{settings.DB_NAME}")
    print(f"Admin email filter: {args.admin_email}")
    if args.tenant_id:
        print(f"Tenant focus: {args.tenant_id}")

    try:
        db = SessionLocal()
    except Exception as e:
        print(f"\nFAIL: cannot open DB session: {e}")
        return 1

    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        print(f"\nFAIL: cannot connect: {e}")
        db.close()
        return 1

    try:
        show_admin_and_tenants(db, args.admin_email)
        show_menu_shape(db)
        show_features(db)
        show_roles(db, args.tenant_id)
        show_grants_sample(db, args.tenant_id)
        ai_exists = check_ai_menu(db)
        print_sql_template(db, args.tenant_id)
        print_verdict(ai_exists)
    finally:
        db.close()

    return 0


if __name__ == "__main__":
    sys.exit(main())
