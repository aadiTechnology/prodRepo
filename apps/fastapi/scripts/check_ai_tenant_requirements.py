"""
Audit whether the platform has everything needed for Basic vs Advanced
AI Assistant per tenant (school), including metering and billing.

Checks:
  1. SSMS tables + columns (tenant_module_assignments, ai_assistant_tenant_config, …)
  2. FastAPI models / services / API wiring
  3. Frontend AIAssistant behavior
  4. Live DB samples (tenant modules, token usage, config rows)

Usage (from apps/fastapi):
    python scripts/check_ai_tenant_requirements.py

Exit code 0 = all P0 requirements met; 1 = one or more P0 gaps remain.
"""
from __future__ import annotations

import os
import sys
from dataclasses import dataclass, field
from typing import Any

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from dotenv import load_dotenv

load_dotenv(os.getenv("ENV_FILE", ".env"))

from sqlalchemy import text
from app.core.config import settings
from app.core.database import SessionLocal

# ── Requirement catalogue (from COSTING_REQUIREMENTS.md) ─────────────────────

REQUIRED_TABLES: dict[str, str] = {
    "tenants": "School master - allocation key tenant_id",
    "users": "User to tenant mapping",
    "ai_assistant_sessions": "Chat sessions per user (has tenant_id)",
    "ai_assistant_messages": "Message log + token metering (has tenant_id)",
    "tenant_module_assignments": "Tenant bought modules (AI_ASSISTANT / AI_ASSISTANT_ADVANCED)",
    "ai_assistant_tenant_config": "Plan tier, llm_enabled, caps, billing per school",
}

OPTIONAL_TABLES: dict[str, str] = {
    "ai_assistant_usage_daily": "Fast daily rollup for dashboards (Phase 3)",
    "ai_assistant_usage_monthly": "Monthly billing rollup (Phase 3)",
    "ai_assistant_user_daily_usage": "Fast per-user daily quota cache (Phase 2)",
    "ai_assistant_provider_rates": "Token price table for cost estimation (Phase 3)",
}

REQUIRED_COLUMNS: dict[str, list[str]] = {
    "ai_assistant_messages": [
        "tenant_id",
        "user_id",
        "role",
        "message_text",
        "input_source",
        "llm_provider",
        "tokens_prompt",
        "tokens_completion",
        "tokens_total",
        "created_at",
    ],
    "ai_assistant_sessions": ["tenant_id", "user_id"],
    "tenant_module_assignments": ["tenant_id", "module_name", "is_active"],
    "ai_assistant_tenant_config": [
        "tenant_id",
        "ai_enabled",
        "llm_enabled",
        "plan_tier",
        "monthly_llm_unit_cap",
        "daily_llm_unit_cap_per_user",
        "monthly_fee_inr",
    ],
}

FUTURE_MESSAGE_COLUMNS = [
    "resolution_tier",
    "feature_type",
    "llm_unit_weight",
    "estimated_cost_usd",
    "quota_blocked",
]

CODE_CHECKS: list[tuple[str, str, str]] = [
    (
        "P0",
        "Token persist on interpret",
        "app/services/ai_chat_service.py",
        "tokens_total",
    ),
    (
        "P0",
        "LLM interpret endpoint",
        "app/routers/ai.py",
        "/interpret",
    ),
    (
        "P0",
        "Intent service interpret()",
        "app/services/intent_service.py",
        "def interpret(",
    ),
    (
        "P0",
        "Options on clarification",
        "app/schemas/ai.py",
        "options",
    ),
    (
        "P1",
        "Tenant config SQLAlchemy model",
        "app/models/",
        "ai_assistant_tenant_config",
    ),
    (
        "P1",
        "Tenant module model / service",
        "app/",
        "tenant_module_assignments",
    ),
    (
        "P1",
        "LLM gate by tenant plan",
        "app/services/intent_service.py",
        "llm_enabled",
    ),
    (
        "P1",
        "GET /api/ai/usage/me",
        "app/routers/ai.py",
        "/usage/me",
    ),
    (
        "P1",
        "Frontend option chips",
        "web/src/components/AIAssistant.tsx",
        "pickOption",
    ),
    (
        "P2",
        "Frontend plan gate (basic vs advanced)",
        "web/src/components/AIAssistant.tsx",
        "llm_enabled",
    ),
]

AI_MODULE_NAMES = ("AI_ASSISTANT", "AI_ASSISTANT_ADVANCED")


@dataclass
class CheckResult:
    name: str
    priority: str  # P0, P1, P2, INFO
    status: str  # OK, MISSING, PARTIAL, SKIP
    detail: str = ""


@dataclass
class AuditReport:
    results: list[CheckResult] = field(default_factory=list)

    def add(self, name: str, priority: str, status: str, detail: str = "") -> None:
        self.results.append(CheckResult(name, priority, status, detail))

    def p0_failures(self) -> list[CheckResult]:
        return [r for r in self.results if r.priority == "P0" and r.status != "OK"]

    def summary_by_status(self) -> dict[str, int]:
        out: dict[str, int] = {}
        for r in self.results:
            out[r.status] = out.get(r.status, 0) + 1
        return out


def _header(title: str) -> None:
    print(f"\n{'=' * 64}")
    print(title)
    print("=" * 64)


def _section(title: str) -> None:
    print(f"\n{'-' * 64}")
    print(title)
    print("-" * 64)


def _table_exists(db, table: str) -> bool:
    row = db.execute(
        text(
            "SELECT 1 FROM sys.tables t "
            "JOIN sys.schemas s ON t.schema_id = s.schema_id "
            "WHERE s.name = 'dbo' AND t.name = :t"
        ),
        {"t": table},
    ).first()
    return row is not None


def _table_columns(db, table: str) -> set[str]:
    rows = db.execute(
        text(
            "SELECT c.name FROM sys.columns c "
            "JOIN sys.tables t ON c.object_id = t.object_id "
            "JOIN sys.schemas s ON t.schema_id = s.schema_id "
            "WHERE s.name = 'dbo' AND t.name = :t"
        ),
        {"t": table},
    ).fetchall()
    return {r[0].lower() for r in rows}


def _file_contains(rel_path: str, needle: str) -> bool:
    """Search under apps/fastapi (backend) or apps/web (frontend)."""
    apps_root = os.path.dirname(parent_dir)  # .../apps
    if rel_path.startswith("web/"):
        path = os.path.join(apps_root, rel_path.replace("/", os.sep))
    elif rel_path.endswith("/") or rel_path.endswith("\\"):
        folder = os.path.join(parent_dir, rel_path.replace("/", os.sep).rstrip(os.sep))
        if not os.path.isdir(folder):
            folder = os.path.join(apps_root, rel_path.replace("/", os.sep).rstrip(os.sep))
        if not os.path.isdir(folder):
            return False
        for root, _dirs, files in os.walk(folder):
            for fn in files:
                if not fn.endswith((".py", ".tsx", ".ts")):
                    continue
                try:
                    with open(os.path.join(root, fn), encoding="utf-8") as f:
                        if needle in f.read():
                            return True
                except OSError:
                    pass
        return False
    else:
        # Backend paths: app/routers/ai.py
        path = os.path.join(parent_dir, rel_path.replace("/", os.sep))
        if not os.path.isfile(path):
            path = os.path.join(apps_root, rel_path.replace("/", os.sep))
    if not os.path.isfile(path):
        return False
    try:
        with open(path, encoding="utf-8") as f:
            return needle in f.read()
    except OSError:
        return False


def check_database(report: AuditReport) -> SessionLocal | None:
    _section("1. Database connection")
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        report.add("DB connection", "P0", "OK", f"{settings.DB_SERVER}/{settings.DB_NAME}")
        print(f"  OK - connected to {settings.DB_SERVER}/{settings.DB_NAME}")
        return db
    except Exception as e:
        report.add("DB connection", "P0", "MISSING", str(e))
        print(f"  FAIL - cannot connect: {e}")
        return None


def check_tables(db, report: AuditReport) -> None:
    _section("2. Required SSMS tables (P0)")
    for table, purpose in REQUIRED_TABLES.items():
        if _table_exists(db, table):
            report.add(f"Table dbo.{table}", "P0", "OK", purpose)
            print(f"  OK   dbo.{table:<30} - {purpose}")
        else:
            report.add(f"Table dbo.{table}", "P0", "MISSING", purpose)
            print(f"  MISS dbo.{table:<30} - {purpose}")

    _section("3. Optional SSMS tables (P1/P2 - billing rollups)")
    for table, purpose in OPTIONAL_TABLES.items():
        if _table_exists(db, table):
            report.add(f"Table dbo.{table}", "P2", "OK", purpose)
            print(f"  OK   dbo.{table}")
        else:
            report.add(f"Table dbo.{table}", "P2", "MISSING", purpose)
            print(f"  -    dbo.{table} (not created yet)")


def check_columns(db, report: AuditReport) -> None:
    _section("4. Required columns on key tables")
    for table, cols in REQUIRED_COLUMNS.items():
        if not _table_exists(db, table):
            for col in cols:
                report.add(f"dbo.{table}.{col}", "P0", "MISSING", "table missing")
            print(f"  SKIP dbo.{table} - table does not exist")
            continue
        existing = _table_columns(db, table)
        missing = [c for c in cols if c.lower() not in existing]
        if missing:
            for col in missing:
                report.add(f"dbo.{table}.{col}", "P0", "MISSING")
            print(f"  PART dbo.{table} - missing: {', '.join(missing)}")
        else:
            report.add(f"dbo.{table} columns", "P0", "OK", f"{len(cols)} columns")
            print(f"  OK   dbo.{table} - all {len(cols)} required columns present")

    if _table_exists(db, "ai_assistant_messages"):
        existing = _table_columns(db, "ai_assistant_messages")
        future_missing = [c for c in FUTURE_MESSAGE_COLUMNS if c.lower() not in existing]
        if future_missing:
            report.add("Future message columns", "P2", "MISSING", ", ".join(future_missing))
            print(f"  INFO dbo.ai_assistant_messages - future cols not yet added: {future_missing}")
        else:
            report.add("Future message columns", "P2", "OK")
            print("  OK   dbo.ai_assistant_messages - future metering columns present")


def check_tenant_modules(db, report: AuditReport) -> None:
    _section("5. tenant_module_assignments data (Basic / Advanced entitlement)")
    if not _table_exists(db, "tenant_module_assignments"):
        return
    try:
        rows = db.execute(
            text(
                "SELECT t.id, t.code, t.name, m.module_name, m.is_active "
                "FROM dbo.tenant_module_assignments m "
                "JOIN dbo.tenants t ON t.id = m.tenant_id "
                "WHERE m.module_name IN ('AI_ASSISTANT', 'AI_ASSISTANT_ADVANCED') "
                "ORDER BY t.id, m.module_name"
            )
        ).fetchall()
        if not rows:
            report.add("AI module assignments", "P1", "MISSING", "No AI_ASSISTANT rows for any tenant")
            print("  MISS - no rows for AI_ASSISTANT / AI_ASSISTANT_ADVANCED")
            print("         Add rows per school, e.g.:")
            print("           INSERT tenant_module_assignments (tenant_id, module_name, is_active, created_at)")
            print("           VALUES (1, 'AI_ASSISTANT', 1, GETDATE());")
            print("           VALUES (1, 'AI_ASSISTANT_ADVANCED', 1, GETDATE());  -- Advanced only")
        else:
            report.add("AI module assignments", "P1", "OK", f"{len(rows)} row(s)")
            for r in rows:
                flag = "active" if r[4] else "inactive"
                print(f"  OK   tenant {r[0]} ({r[1]}) - {r[3]} [{flag}]")
    except Exception as e:
        report.add("AI module assignments", "P1", "PARTIAL", str(e))
        print(f"  WARN - query failed: {e}")


def check_tenant_config(db, report: AuditReport) -> None:
    _section("6. ai_assistant_tenant_config data (plan + caps + billing)")
    if not _table_exists(db, "ai_assistant_tenant_config"):
        return
    try:
        rows = db.execute(
            text(
                "SELECT c.tenant_id, t.code, c.plan_tier, c.ai_enabled, c.llm_enabled, "
                "c.monthly_llm_unit_cap, c.monthly_fee_inr "
                "FROM dbo.ai_assistant_tenant_config c "
                "LEFT JOIN dbo.tenants t ON t.id = c.tenant_id "
                "ORDER BY c.tenant_id"
            )
        ).fetchall()
        if not rows:
            report.add("Tenant AI config rows", "P1", "MISSING", "No config per school")
            print("  MISS - table exists but no rows (one row per tenant required)")
        else:
            basic = adv = 0
            for r in rows:
                tier = (r[2] or "").lower()
                llm = bool(r[4])
                if tier == "basic" or not llm:
                    basic += 1
                else:
                    adv += 1
                print(
                    f"  OK   tenant {r[0]} ({r[1]}) plan={r[2]} ai={r[3]} llm={r[4]} "
                    f"cap={r[5]} fee_inr={r[6]}"
                )
            report.add(
                "Tenant AI config rows",
                "P1",
                "OK",
                f"{len(rows)} school(s): ~{adv} advanced, ~{basic} basic",
            )
    except Exception as e:
        report.add("Tenant AI config rows", "P1", "PARTIAL", str(e))
        print(f"  WARN - query failed: {e}")


def check_token_usage(db, report: AuditReport) -> None:
    _section("7. Token metering (ai_assistant_messages) - live data")
    if not _table_exists(db, "ai_assistant_messages"):
        return
    try:
        summary = db.execute(
            text(
                "SELECT "
                "  COUNT(*) AS total_msgs, "
                "  SUM(CASE WHEN tokens_total > 0 THEN 1 ELSE 0 END) AS llm_msgs, "
                "  SUM(ISNULL(tokens_total, 0)) AS all_tokens, "
                "  SUM(CASE WHEN llm_provider IS NOT NULL THEN 1 ELSE 0 END) AS with_provider "
                "FROM dbo.ai_assistant_messages "
                "WHERE role = 'assistant' AND is_deleted = 0"
            )
        ).first()
        print(
            f"  INFO assistant messages: total={summary[0]}, llm_calls={summary[1]}, "
            f"tokens={summary[2]}, with_provider={summary[3]}"
        )
        if summary[1] and summary[1] > 0:
            report.add("Token metering (data)", "P0", "OK", f"{summary[1]} LLM rows logged")
        else:
            report.add(
                "Token metering (data)",
                "P0",
                "PARTIAL",
                "No LLM rows yet - send an ambiguous phrase to test",
            )

        monthly = db.execute(
            text(
                "SELECT TOP 10 m.tenant_id, t.code, COUNT(*) AS llm_calls, "
                "SUM(ISNULL(m.tokens_total, 0)) AS total_tokens "
                "FROM dbo.ai_assistant_messages m "
                "LEFT JOIN dbo.tenants t ON t.id = m.tenant_id "
                "WHERE m.role = 'assistant' AND m.is_deleted = 0 "
                "  AND ISNULL(m.tokens_total, 0) > 0 "
                "  AND m.created_at >= DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1) "
                "GROUP BY m.tenant_id, t.code "
                "ORDER BY total_tokens DESC"
            )
        ).fetchall()
        if monthly:
            print("\n  Monthly LLM usage by school (your billing query):")
            for r in monthly:
                print(f"    tenant {r[0]} ({r[1]}): {r[2]} calls, {r[3]} tokens")
            report.add("Monthly usage by tenant", "P1", "OK")
        else:
            print("  INFO - no LLM usage this month yet")
            report.add("Monthly usage by tenant", "P1", "PARTIAL", "no data this month")
    except Exception as e:
        report.add("Token metering", "P0", "PARTIAL", str(e))
        print(f"  WARN - {e}")


def check_codebase(report: AuditReport) -> None:
    _section("8. Application code wiring")
    for priority, label, path, needle in CODE_CHECKS:
        found = _file_contains(path, needle)
        status = "OK" if found else "MISSING"
        report.add(label, priority, status, f"{path} -> '{needle}'")
        mark = "OK  " if found else "MISS"
        print(f"  {mark} [{priority}] {label}")


def check_env(report: AuditReport) -> None:
    _section("9. API keys (.env) - Advanced tier needs LLM provider")
    nvidia = (settings.NVIDIA_API_KEY or "").strip()
    openai = (settings.OPENAI_API_KEY or "").strip()
    if nvidia:
        report.add("LLM provider", "P0", "OK", "NVIDIA_API_KEY set")
        print("  OK   NVIDIA_API_KEY is set (primary)")
    elif openai:
        report.add("LLM provider", "P0", "OK", "OPENAI_API_KEY set")
        print("  OK   OPENAI_API_KEY is set (fallback)")
    else:
        report.add("LLM provider", "P0", "MISSING", "No NVIDIA or OpenAI key")
        print("  MISS - set NVIDIA_API_KEY or OPENAI_API_KEY for Advanced tier")


def print_roadmap(report: AuditReport) -> None:
    _section("10. What you have vs what is still needed")

    have: list[str] = []
    need_p0: list[str] = []
    need_p1: list[str] = []

    checks = {
        "Chat + token columns in SSMS": any(
            r.name.startswith("Table dbo.ai_assistant") and r.status == "OK" for r in report.results
        ),
        "Tokens saved on LLM calls": any(r.name == "Token persist on interpret" and r.status == "OK" for r in report.results),
        "Interpret API + options UI": any(r.name == "LLM interpret endpoint" and r.status == "OK" for r in report.results),
        "tenant_module_assignments table": any(
            r.name == "Table dbo.tenant_module_assignments" and r.status == "OK" for r in report.results
        ),
        "ai_assistant_tenant_config table": any(
            r.name == "Table dbo.ai_assistant_tenant_config" and r.status == "OK" for r in report.results
        ),
        "Per-tenant plan rows": any(r.name == "Tenant AI config rows" and r.status == "OK" for r in report.results),
        "AI module rows per school": any(r.name == "AI module assignments" and r.status == "OK" for r in report.results),
        "Server gate basic vs advanced": any(r.name == "LLM gate by tenant plan" and r.status == "OK" for r in report.results),
        "Frontend plan gate": any(r.name == "Frontend plan gate (basic vs advanced)" and r.status == "OK" for r in report.results),
        "Usage API for admins": any(r.name == "GET /api/ai/usage/me" and r.status == "OK" for r in report.results),
    }

    for k, v in checks.items():
        (have if v else need_p1).append(k)

    for r in report.p0_failures():
        need_p0.append(r.name)

    print("\n  READY TODAY (Basic navigation + metering foundation):")
    for item in have:
        print(f"    + {item}")

    if need_p0:
        print("\n  BLOCKERS (fix first):")
        for item in need_p0:
            print(f"    - {item}")

    print("\n  STILL NEEDED for Basic vs Advanced per tenant + billing:")
    for item in [
        "CREATE TABLE ai_assistant_tenant_config + seed one row per school",
        "INSERT tenant_module_assignments (AI_ASSISTANT / AI_ASSISTANT_ADVANCED)",
        "FastAPI model + service to read tenant plan",
        "Gate interpret() when plan=basic or llm_enabled=0",
        "Expose plan on login/RBAC context for AIAssistant.tsx",
        "Optional: GET /api/ai/usage/me + admin billing screen",
        "Optional: ai_assistant_usage_monthly rollup job",
    ]:
        if item not in [x for x in need_p1]:
            print(f"    o {item}")


def main() -> int:
    _header("AI Assistant - Tenant Basic/Advanced Requirements Audit")
    print("Reference: web/docs/ai-assistant/COSTING_REQUIREMENTS.md")

    report = AuditReport()

    check_env(report)
    db = check_database(report)
    if db:
        try:
            check_tables(db, report)
            check_columns(db, report)
            check_tenant_modules(db, report)
            check_tenant_config(db, report)
            check_token_usage(db, report)
        finally:
            db.close()

    check_codebase(report)
    print_roadmap(report)

    _header("SUMMARY")
    counts = report.summary_by_status()
    for status, n in sorted(counts.items()):
        print(f"  {status}: {n}")

    p0_fails = report.p0_failures()
    if p0_fails:
        print(f"\nRESULT: NOT READY - {len(p0_fails)} P0 issue(s)")
        for r in p0_fails:
            print(f"  - {r.name}: {r.detail}")
        return 1

    print("\nRESULT: P0 requirements OK - metering foundation works.")
    print("        Basic/Advanced per-tenant gating still needs ai_assistant_tenant_config + server gate.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
