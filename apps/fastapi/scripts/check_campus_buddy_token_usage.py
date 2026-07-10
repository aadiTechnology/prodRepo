"""
Check whether Campus Buddy phrases consume NVIDIA/OpenAI tokens or run locally.

Uses the REAL server path:
  - Loads user from DB (--email or --user-id)
  - RBAC allowed menus via intent_service._build_allowed_menus
  - Full interpret() including Permission Mapping + LLM gate
  - Reports Tier 2 (local, 0 tokens) vs Tier 3 (LLM, API consumed)

Usage (from apps/fastapi):
    python scripts/check_campus_buddy_token_usage.py --tenant-id 20 --email shantin1@gmail.com
    python scripts/check_campus_buddy_token_usage.py --tenant-id 27 --email akash@gmail.com \\
        "take me to fee please" "open attendance" "show me notices"

Default phrases (if none passed) match common Campus Buddy tests.
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
from app.models.user import User
from app.services import intent_service
from app.services.ai_permission_sync_service import (
    resolve_effective_llm_enabled,
    user_has_ai_assistant_access,
    user_has_llm_permission,
)
from app.services.intent_service import interpret

DEFAULT_PHRASES = [
    "Open Students Creation",
    "take me to fee please",
    "open attendace",
    "open attendance",
    "show me notices",
    "take me to students please",
    "hi",
]


def _mask(key: str) -> str:
    key = (key or "").strip()
    if len(key) <= 12:
        return "(empty)" if not key else "***"
    return f"{key[:8]}...{key[-4:]}"


def _active_provider() -> tuple[str, str, str]:
    nvidia_key = (settings.NVIDIA_API_KEY or "").strip()
    if nvidia_key:
        model = (settings.NVIDIA_MODEL or "meta/llama-3.1-8b-instruct").strip()
        return "nvidia", model, _mask(nvidia_key)
    openai_key = (settings.OPENAI_API_KEY or "").strip()
    if openai_key:
        model = (settings.OPENAI_MODEL or "gpt-4o-mini").strip()
        return "openai", model, _mask(openai_key)
    return "none", "-", "(empty)"


def _find_user(db, tenant_id: int | None, email: str | None, user_id: int | None) -> User:
    q = db.query(User)
    if user_id is not None:
        u = q.filter(User.id == user_id).first()
        if not u:
            raise SystemExit(f"User id {user_id} not found.")
        return u
    if email:
        u = q.filter(User.email == email).first()
        if not u:
            raise SystemExit(f"User email {email!r} not found.")
        return u
    if tenant_id is not None:
        u = q.filter(User.tenant_id == tenant_id, User.role == "ADMIN").first()
        if not u:
            u = q.filter(User.tenant_id == tenant_id).first()
        if not u:
            raise SystemExit(f"No user found for tenant_id={tenant_id}.")
        return u
    raise SystemExit("Provide --email, --user-id, or --tenant-id.")


def _analyze_phrase(db, user: User, phrase: str, provider: str, llm_allowed: bool) -> None:
    print(f'\nPhrase: "{phrase}"')

    if not user_has_ai_assistant_access(db, user):
        print("  Access  : DENIED (AI not assigned in Permission Mapping)")
        print("  Tier    : n/a")
        print("  Tokens  : 0")
        return

    menus = intent_service._build_allowed_menus(db, user)
    local = intent_service._local_match(phrase, menus)
    if local:
        print("  Tier    : 2 LOCAL MATCH (no API call)")
        print("  Provider: none")
        print("  Tokens  : 0  <-- NVIDIA/OpenAI key NOT consumed")
        print(f"  Result  : {local.get('menu_name')!r} -> {local.get('route')}")
        return

    if not llm_allowed:
        print("  Tier    : 1 BASIC BLOCK (LLM not allowed for this user)")
        print("  Provider: none")
        print("  Tokens  : 0  <-- no API call (Basic plan / no AI Advanced grant)")
        response, usage = interpret(db, user, phrase)
        msg = (response.error_message or "").strip()
        print(f"  Result  : {response.error_type} - {msg[:100]}")
        return

    print("  Tier    : 3 LLM (local match failed -> API call)")

    if provider == "none":
        print("  Provider: none configured")
        print("  Tokens  : 0 (would call LLM but no API key in .env)")
        response, usage = interpret(db, user, phrase)
        print(f"  Result  : {response.error_type} - {(response.error_message or '')[:100]}")
        return

    response, usage = interpret(db, user, phrase)
    if usage and int(usage.get("total", 0) or 0) > 0:
        print(f"  Provider: {usage.get('provider', provider)}  <-- API KEY CONSUMED")
        print(
            f"  Tokens  : prompt={usage.get('prompt', 0)} "
            f"completion={usage.get('completion', 0)} "
            f"total={usage.get('total', 0)}"
        )
    elif usage and usage.get("provider") == "local":
        print("  Provider: local (interpret fell back without LLM)")
        print("  Tokens  : 0")
    else:
        print(f"  Provider: {provider}")
        print("  Tokens  : 0 or unknown")

    if response.error_type:
        print(f"  Result  : {response.error_type} - {(response.error_message or '')[:120]}")
    elif response.route:
        label = response.menu_name or response.route
        print(f"  Result  : Opening {label!r} -> {response.route}")
    else:
        print("  Result  : (no route)")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Check Campus Buddy phrases: local (0 tokens) vs LLM (NVIDIA/OpenAI)."
    )
    parser.add_argument("phrases", nargs="*", help="Phrases to test")
    parser.add_argument("--tenant-id", type=int, default=None)
    parser.add_argument("--email", type=str, default=None)
    parser.add_argument("--user-id", type=int, default=None)
    args = parser.parse_args()

    phrases = args.phrases or DEFAULT_PHRASES
    provider, model, key_masked = _active_provider()

    db = SessionLocal()
    try:
        user = _find_user(db, args.tenant_id, args.email, args.user_id)
        tenant_id = user.tenant_id
        llm_allowed = resolve_effective_llm_enabled(db, user)
        ai_access = user_has_ai_assistant_access(db, user)
        llm_perm = user_has_llm_permission(db, user)
        menu_count = len(intent_service._build_allowed_menus(db, user))

        print("=" * 68)
        print("Campus Buddy - Token Usage Check (real user + RBAC menus)")
        print("=" * 68)
        print(f"User        : {user.email} (id={user.id}, tenant_id={tenant_id})")
        print(f"AI access   : {'YES' if ai_access else 'NO'} (Permission Mapping)")
        print(f"LLM grant   : {'YES' if llm_perm else 'NO'} (AI Advanced menu)")
        print(f"LLM allowed : {'YES' if llm_allowed else 'NO'} (effective gate)")
        print(f"Nav menus   : {menu_count} allowed pages for AI")
        print(f"Provider    : {provider} (priority: NVIDIA > OpenAI)")
        print(f"  Model     : {model}")
        print(f"  Key       : {key_masked}")

        if tenant_id is not None:
            row = db.execute(
                text(
                    "SELECT plan_tier, ai_enabled, llm_enabled "
                    "FROM dbo.ai_assistant_tenant_config WHERE tenant_id=:tid"
                ),
                {"tid": tenant_id},
            ).fetchone()
            if row:
                print(f"DB config   : tier={row[0]} ai_enabled={row[1]} llm_enabled={row[2]}")
            else:
                print("DB config   : (no row — defaults)")

        for phrase in phrases:
            _analyze_phrase(db, user, phrase, provider, llm_allowed)

        print("\n" + "=" * 68)
        print("SUMMARY")
        print("  Tier 2 LOCAL  = 0 tokens, no NVIDIA/OpenAI call")
        print("  Tier 3 LLM    = API key consumed (see prompt/completion/total)")
        print("  BASIC BLOCK   = 0 tokens, LLM not enabled for user")
        print("  'Which page?' = usually from LLM (Tier 3) when phrase is ambiguous")
        print("=" * 68)
    finally:
        db.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
