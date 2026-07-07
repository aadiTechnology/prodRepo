"""
Check whether a navigation phrase (like the one you type in Campus Buddy /
AIAssistant.tsx) actually consumes an AI API key, WHICH provider it hits,
and HOW MANY tokens it costs.

It replays the EXACT server logic from
    app/services/intent_service.py  (the code behind POST /api/ai/interpret)

Flow that the assistant uses (see docs/ai-assistant/TOKEN_USAGE.md):
    Tier 2 - local match  -> 0 tokens (no API key used)
    Tier 3 - LLM          -> NVIDIA (if NVIDIA_API_KEY set) else OpenAI

So a phrase only "consumes NVIDIA key" if it FAILS the local match and
NVIDIA_API_KEY is set. This script tells you exactly what happens for each
phrase and prints the real prompt/completion/total tokens returned by the
provider (the same numbers you see as `[AI-NAV] nvidia tokens ...` in the
FastAPI log / your SSMS token table).

Usage (from apps/fastapi):
    python scripts/check_nav_token_usage.py
    python scripts/check_nav_token_usage.py "where i can see attendance report"
    python scripts/check_nav_token_usage.py "fees" "add teacher" "attendance"
    python scripts/check_nav_token_usage.py --menus-file my_menus.json "attendance report"

--menus-file is an optional JSON file with the menus visible to a user (RBAC).
Each item: {"menu_id": 1, "menu_name": "Attendance Report", "parent_menu_id": null,
            "parent_menu_name": "", "route": "/attendance/report"}
If omitted, a built-in SAMPLE menu set is used so you can see the behaviour.

Exit code 0 always (this is a diagnostic, not a pass/fail gate).
"""
from __future__ import annotations

import argparse
import json
import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from dotenv import load_dotenv

load_dotenv(os.getenv("ENV_FILE", ".env"))

from app.core.config import settings
from app.services import intent_service


# A representative set of RBAC menus (what buildNavigableMenus produces on the
# client / _build_allowed_menus produces on the server). Replace via --menus-file
# to test against a specific user's real menus.
SAMPLE_MENUS: list[dict] = [
    {"menu_id": 1, "menu_name": "Dashboard", "parent_menu_id": None, "parent_menu_name": "", "route": "/dashboard"},
    {"menu_id": 2, "menu_name": "Attendance Report", "parent_menu_id": 20, "parent_menu_name": "Academics", "route": "/attendance/report"},
    {"menu_id": 3, "menu_name": "Mark Attendance", "parent_menu_id": 20, "parent_menu_name": "Academics", "route": "/attendance/mark"},
    {"menu_id": 4, "menu_name": "Homework", "parent_menu_id": 20, "parent_menu_name": "Academics", "route": "/homework"},
    {"menu_id": 5, "menu_name": "Fee Collection", "parent_menu_id": 30, "parent_menu_name": "Fees Related", "route": "/fees/collection"},
    {"menu_id": 6, "menu_name": "Fee Structure", "parent_menu_id": 30, "parent_menu_name": "Fees Related", "route": "/fees/setup"},
    {"menu_id": 7, "menu_name": "Users", "parent_menu_id": 40, "parent_menu_name": "User Related", "route": "/users"},
    {"menu_id": 8, "menu_name": "Roles", "parent_menu_id": 40, "parent_menu_name": "User Related", "route": "/roles"},
    {"menu_id": 9, "menu_name": "Classes", "parent_menu_id": 20, "parent_menu_name": "Academics", "route": "/classes"},
    {"menu_id": 10, "menu_name": "Teachers", "parent_menu_id": 40, "parent_menu_name": "User Related", "route": "/teachers"},
    {"menu_id": 11, "menu_name": "Notices", "parent_menu_id": 50, "parent_menu_name": "Communication", "route": "/communication/notices"},
    {"menu_id": 12, "menu_name": "Report Cards", "parent_menu_id": 20, "parent_menu_name": "Academics", "route": "/report-cards"},
]

DEFAULT_PHRASES = [
    "where i can see attendance report",
    "attendance report",
    "attendance",
    "fees",
    "add teacher",
    "how many students were absent last week",
]


def _mask(key: str) -> str:
    key = (key or "").strip()
    if len(key) <= 12:
        return "(empty)" if not key else "***"
    return f"{key[:8]}...{key[-4:]}"


def _active_provider() -> tuple[str, str, str]:
    """Return (provider, model, key_masked) using the SAME priority as _call_llm."""
    nvidia_key = (settings.NVIDIA_API_KEY or "").strip()
    if nvidia_key:
        model = (settings.NVIDIA_MODEL or "meta/llama-3.1-8b-instruct").strip()
        return "nvidia", model, _mask(nvidia_key)
    openai_key = (settings.OPENAI_API_KEY or "").strip()
    if openai_key:
        model = (settings.OPENAI_MODEL or "gpt-4o-mini").strip()
        return "openai", model, _mask(openai_key)
    return "none", "-", "(empty)"


def _load_menus(path: str | None) -> list[dict]:
    if not path:
        return SAMPLE_MENUS
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError("--menus-file must contain a JSON array of menu objects")
    return data


def _install_token_capture() -> dict:
    """Monkeypatch intent_service._log_token_usage to capture real usage."""
    captured: dict = {}
    original = intent_service._log_token_usage

    def _capture(usage, source):  # type: ignore[no-untyped-def]
        if usage:
            prompt = getattr(usage, "prompt_tokens", None) or 0
            completion = getattr(usage, "completion_tokens", None) or 0
            total = getattr(usage, "total_tokens", None) or (prompt + completion)
            captured.update(
                prompt=prompt, completion=completion, total=total, source=source
            )
        original(usage, source)

    intent_service._log_token_usage = _capture  # type: ignore[assignment]
    return captured


def _analyze_phrase(phrase: str, menus: list[dict], provider: str) -> None:
    print(f'\nPhrase: "{phrase}"')

    local = intent_service._local_match(phrase, menus)
    if local:
        print("  Tier    : 2 (LOCAL MATCH - no API call)")
        print(f"  Provider: none")
        print(f"  Tokens  : 0  <-- NVIDIA key NOT consumed")
        print(f"  Result  : {local.get('menu_name')!r} -> {local.get('route')}")
        return

    print("  Tier    : 3 (LLM - local match failed, API key IS used)")

    if provider == "none":
        print("  Provider: none configured (set NVIDIA_API_KEY or OPENAI_API_KEY)")
        print("  Tokens  : 0 (assistant returns 'not configured' error)")
        return

    limit = max(4, min(getattr(settings, "AI_NAV_LLM_CANDIDATE_LIMIT", 8), 15))
    candidates = intent_service._rank_llm_candidates(phrase, menus, limit)
    cand_names = ", ".join(c["menu_name"] for c in candidates)
    print(f"  Candidates sent ({len(candidates)}): {cand_names}")

    captured = _install_token_capture()
    data, _usage = intent_service._call_llm(phrase, menus)

    if captured:
        print(f"  Provider: {captured.get('source', provider)}  <-- API key consumed")
        print(
            f"  Tokens  : prompt={captured['prompt']} "
            f"completion={captured['completion']} total={captured['total']}"
        )
    else:
        print(f"  Provider: {provider} (no usage returned - call likely failed)")
        print("  Tokens  : unknown")

    if data.get("error_type"):
        print(f"  Result  : {data.get('error_type')} - {data.get('error_message')}")
    else:
        print(f"  Result  : {data.get('menu_name')!r} -> {data.get('route')}")

    if data.get("error_type") or not (data.get("route") or "").strip():
        options = intent_service._relevant_options(phrase, menus)
        if options:
            picks = ", ".join(f"{o.menu_name} ({o.route})" for o in options)
            print(f"  Options : {picks}")
        else:
            print("  Options : (none)")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Check if a navigation phrase consumes the NVIDIA/OpenAI key and how many tokens."
    )
    parser.add_argument("phrases", nargs="*", help="Phrases to test (default: a built-in set)")
    parser.add_argument("--menus-file", help="JSON file with RBAC menus for a specific user")
    args = parser.parse_args()

    phrases = args.phrases or DEFAULT_PHRASES
    menus = _load_menus(args.menus_file)
    provider, model, key_masked = _active_provider()

    print("=" * 64)
    print("Navigation Assistant - Token Usage Check")
    print("=" * 64)
    print(f"Active provider (priority NVIDIA > OpenAI): {provider}")
    print(f"  Model            : {model}")
    print(f"  Key              : {key_masked}")
    print(f"  Max out tokens   : {getattr(settings, 'AI_NAV_MAX_OUTPUT_TOKENS', 150)}")
    print(f"  Candidate limit  : {getattr(settings, 'AI_NAV_LLM_CANDIDATE_LIMIT', 8)}")
    print(f"  Menus source     : {args.menus_file or 'built-in SAMPLE set'} ({len(menus)} menus)")

    if provider == "none":
        print("\nNOTE: No AI key is set, so NO phrase can consume tokens.")

    for phrase in phrases:
        _analyze_phrase(phrase, menus, provider)

    print("\n" + "=" * 64)
    print("Legend: Tier 2 = 0 tokens (free) | Tier 3 = real API tokens")
    print("Only Tier 3 phrases consume your NVIDIA/OpenAI key.")
    print("=" * 64)
    return 0


if __name__ == "__main__":
    sys.exit(main())
