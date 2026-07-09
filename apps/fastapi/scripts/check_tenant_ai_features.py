"""
Check which AI Assistant features a tenant currently has.

Reports:
  1) Tenant identity
  2) ai_assistant_tenant_config row (plan + llm_enabled)
  3) tenant_module_assignments for AI_ASSISTANT / AI_ASSISTANT_ADVANCED
  4) AI menus/pages in dbo.menus
  5) Role-level grants (Permission Management -> role_menu_permissions)
  6) Effective verdict: Basic vs Advanced + LLM yes/no

Usage:
    python scripts/check_tenant_ai_features.py --tenant-id 20
    python scripts/check_tenant_ai_features.py --tenant-name "ShantiNiketan"
"""
from __future__ import annotations

import os
import sys
import argparse

from sqlalchemy import text

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from dotenv import load_dotenv

load_dotenv(os.getenv("ENV_FILE", ".env"))

from app.core.config import settings
from app.core.database import SessionLocal


def _header(title: str) -> None:
    print(f"\n{'=' * 70}")
    print(title)
    print("=" * 70)


def _section(title: str) -> None:
    print(f"\n{'-' * 70}")
    print(title)
    print("-" * 70)


def _table_exists(db, table_name: str) -> bool:
    row = db.execute(
        text(
            "SELECT 1 FROM sys.tables t "
            "JOIN sys.schemas s ON t.schema_id = s.schema_id "
            "WHERE s.name='dbo' AND t.name=:t"
        ),
        {"t": table_name},
    ).first()
    return row is not None


def _bool01(v) -> int:
    return 1 if bool(v) else 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Check tenant AI Assistant feature entitlement")
    parser.add_argument("--tenant-id", type=int, default=None, help="Tenant id, e.g. 20")
    parser.add_argument(
        "--tenant-name",
        default=None,
        help='Tenant/school name, e.g. "ShantiNiketan"',
    )
    args = parser.parse_args()

    if args.tenant_id is None and not args.tenant_name:
        print("Provide --tenant-id or --tenant-name")
        return 1

    _header("Tenant AI Assistant Feature Check")
    print(f"DB: {settings.DB_SERVER}/{settings.DB_NAME}")
    if args.tenant_id is not None:
        print(f"Tenant id input: {args.tenant_id}")
    if args.tenant_name:
        print(f"Tenant name input: {args.tenant_name}")

    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        print(f"\nFAIL: Cannot connect to DB: {e}")
        db.close()
        return 1

    try:
        if args.tenant_id is not None:
            tenant = db.execute(
                text(
                    "SELECT TOP 1 id, code, name, is_active "
                    "FROM dbo.tenants WHERE id=:tid"
                ),
                {"tid": args.tenant_id},
            ).first()
            if not tenant:
                print(f"\nFAIL: Tenant id {args.tenant_id} not found.")
                return 1
        else:
            tenant = db.execute(
                text(
                    "SELECT TOP 1 id, code, name, is_active "
                    "FROM dbo.tenants "
                    "WHERE LOWER(LTRIM(RTRIM(name))) = LOWER(LTRIM(RTRIM(:name))) "
                    "ORDER BY id"
                ),
                {"name": args.tenant_name},
            ).first()
            if not tenant:
                matches = db.execute(
                    text(
                        "SELECT TOP 10 id, code, name FROM dbo.tenants "
                        "WHERE LOWER(name) LIKE LOWER(:q) "
                        "ORDER BY name"
                    ),
                    {"q": f"%{args.tenant_name}%"},
                ).fetchall()
                print("\nFAIL: Tenant not found by exact name.")
                if matches:
                    print("Closest matches:")
                    for m in matches:
                        print(f"  - id={m[0]} code={m[1]} name={m[2]}")
                return 1

        tenant_id = int(tenant[0])
        tenant_code = tenant[1]
        tenant_name = tenant[2]
        tenant_active = bool(tenant[3])

        _section("1) Tenant")
        print(f"tenant_id: {tenant_id}")
        print(f"code     : {tenant_code}")
        print(f"name     : {tenant_name}")
        print(f"is_active: {tenant_active}")

        plan_tier = "basic"
        ai_enabled = 1
        llm_enabled = 0
        has_cfg = False

        _section("2) ai_assistant_tenant_config (SSMS plan)")
        if _table_exists(db, "ai_assistant_tenant_config"):
            cfg = db.execute(
                text(
                    "SELECT tenant_id, ai_enabled, plan_tier, llm_enabled, "
                    "monthly_llm_unit_cap, daily_llm_unit_cap_per_user, monthly_fee_inr "
                    "FROM dbo.ai_assistant_tenant_config "
                    "WHERE tenant_id=:tid"
                ),
                {"tid": tenant_id},
            ).first()
            if cfg:
                has_cfg = True
                ai_enabled = _bool01(cfg[1])
                plan_tier = (cfg[2] or "basic").lower()
                llm_enabled = _bool01(cfg[3])
                print(f"row        : FOUND")
                print(f"plan_tier  : {plan_tier}")
                print(f"ai_enabled : {ai_enabled}")
                print(f"llm_enabled: {llm_enabled}")
                print(f"monthly_cap: {cfg[4]}")
                print(f"daily_cap  : {cfg[5]}")
                print(f"monthly_fee: {cfg[6]}")
            else:
                print("row: MISSING (defaults to basic / no LLM).")
        else:
            print("table missing: dbo.ai_assistant_tenant_config")

        mod_basic = 0
        mod_adv = 0
        _section("3) tenant_module_assignments (SSMS modules)")
        if _table_exists(db, "tenant_module_assignments"):
            mods = db.execute(
                text(
                    "SELECT module_name, is_active "
                    "FROM dbo.tenant_module_assignments "
                    "WHERE tenant_id=:tid "
                    "AND module_name IN ('AI_ASSISTANT', 'AI_ASSISTANT_ADVANCED')"
                ),
                {"tid": tenant_id},
            ).fetchall()
            if not mods:
                print("No AI module rows found for this tenant.")
            else:
                for m in mods:
                    module_name = str(m[0])
                    is_active = _bool01(m[1])
                    print(f"{module_name}: is_active={is_active}")
                    if module_name == "AI_ASSISTANT":
                        mod_basic = is_active
                    if module_name == "AI_ASSISTANT_ADVANCED":
                        mod_adv = is_active
        else:
            print("table missing: dbo.tenant_module_assignments")

        _section("4) AI menus/pages in dbo.menus")
        ai_menu_ids: list[int] = []
        if _table_exists(db, "menus"):
            ai_menu_rows = db.execute(
                text(
                    "SELECT id, parent_id, level, name, path, is_active, tenant_id "
                    "FROM dbo.menus "
                    "WHERE is_deleted=0 AND ("
                    "LOWER(name) LIKE '%ai assistant%' OR "
                    "LOWER(name) LIKE '%campus buddy%' OR "
                    "LOWER(name) LIKE '%ai advanced%' OR "
                    "id IN (156,157,158)"
                    ") "
                    "ORDER BY level, id"
                )
            ).fetchall()
            if not ai_menu_rows:
                print("No AI-related menus found.")
            else:
                for r in ai_menu_rows:
                    # keep Enrollment / false positive out
                    name_l = str(r[3]).lower()
                    if "enrollment" in name_l:
                        continue
                    ai_menu_ids.append(int(r[0]))
                    scope = "global" if r[6] is None else f"tenant {r[6]}"
                    print(
                        f"id={r[0]} level={r[2]} name='{r[3]}' path='{r[4] or ''}' "
                        f"is_active={_bool01(r[5])} scope={scope}"
                    )
        else:
            print("table missing: dbo.menus")

        _section("5) Permission Management grants (role_menu_permissions)")
        granted_basic_page = 0
        granted_advanced_page = 0
        granted_module = 0
        if ai_menu_ids and _table_exists(db, "role_menu_permissions"):
            menu_id_csv = ",".join(str(i) for i in sorted(set(ai_menu_ids)))
            # Match either rmp.tenant_id OR roles belonging to this tenant
            # (some rows leave rmp.tenant_id NULL while role.tenant_id is set)
            q = text(
                "SELECT COALESCE(rmp.tenant_id, r.tenant_id) AS grant_tid, "
                "r.id AS role_id, r.name AS role_name, m.id AS menu_id, m.name AS menu_name, "
                "rmp.can_view, rmp.can_create, rmp.can_edit, rmp.can_delete "
                "FROM dbo.role_menu_permissions rmp "
                "JOIN dbo.roles r ON r.id = rmp.role_id "
                "JOIN dbo.menus m ON m.id = rmp.menu_id "
                f"WHERE m.id IN ({menu_id_csv}) "
                "AND (rmp.tenant_id = :tid OR r.tenant_id = :tid) "
                "ORDER BY r.name, m.level, m.name"
            )
            grants = db.execute(q, {"tid": tenant_id}).fetchall()
            roles = db.execute(
                text(
                    "SELECT id, name, code FROM dbo.roles "
                    "WHERE tenant_id=:tid AND is_deleted=0 ORDER BY name"
                ),
                {"tid": tenant_id},
            ).fetchall()
            print(f"Tenant roles: {', '.join(f'{r[1]}({r[0]})' for r in roles) or '(none)'}")

            if not grants:
                print("NO role grants found for AI Assistant menus/pages in Permission Mapping.")
                print("=> Open Permission Management, select this tenant + Admin role,")
                print("   then check AI Assistant / Campus Buddy / AI Advanced and Save.")
            else:
                for g in grants:
                    flags = "".join(
                        [
                            "V" if g[5] else "-",
                            "C" if g[6] else "-",
                            "E" if g[7] else "-",
                            "D" if g[8] else "-",
                        ]
                    )
                    menu_name_lower = str(g[4]).lower()
                    if "ai assistant" in menu_name_lower and g[5]:
                        granted_module = 1
                    if "campus buddy" in menu_name_lower and g[5]:
                        granted_basic_page = 1
                    if ("advanced" in menu_name_lower or "llm" in menu_name_lower) and g[5]:
                        granted_advanced_page = 1
                    print(f"role={g[2]} | menu={g[4]} | [{flags}]")
        else:
            print("Skipped (no AI menu ids found or role_menu_permissions missing).")

        _section("6) Effective verdict")
        llm_effective = 1 if (ai_enabled == 1 and llm_enabled == 1) else 0
        plan_label = "ADVANCED" if llm_effective else "BASIC"

        print(f"Plan from SSMS config           : {plan_tier.upper()}")
        print(f"LLM effective (backend gate)   : {'YES' if llm_effective else 'NO'} => {plan_label}")
        print(f"Module AI_ASSISTANT assigned   : {'YES' if mod_basic else 'NO'}")
        print(f"Module AI_ASSISTANT_ADVANCED   : {'YES' if mod_adv else 'NO'}")
        print(f"Perm Mgmt: AI Assistant module : {'YES' if granted_module else 'NO'}")
        print(f"Perm Mgmt: Campus Buddy Basic  : {'YES' if granted_basic_page else 'NO'}")
        print(f"Perm Mgmt: AI Advanced (LLM)   : {'YES' if granted_advanced_page else 'NO'}")

        print("\nFeature summary:")
        print(f"- This tenant plan: {plan_label}")
        print(f"- Permission Mapping AI module assigned: {'YES' if granted_module else 'NO'}")
        print(f"- Permission Mapping Basic page assigned: {'YES' if granted_basic_page else 'NO'}")
        print(f"- Permission Mapping Advanced page assigned: {'YES' if granted_advanced_page else 'NO'}")
        print(f"- Advanced LLM (API key) allowed by plan: {'YES' if llm_effective else 'NO'}")

        if not has_cfg:
            print("\nNote: No config row found. Code defaults tenant to basic/no LLM.")

        if llm_effective and not (granted_basic_page or granted_advanced_page or granted_module):
            print("\nGAP: Plan is ADVANCED in SSMS, but Permission Mapping has NOT assigned")
            print("     AI Assistant pages to any role for this tenant.")
            print("     Backend LLM gate is ON, but menu entitlement via Permission Mgmt is missing.")

        return 0

    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
