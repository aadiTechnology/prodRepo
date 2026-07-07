"""
Check OpenAI API key and navigation-assistant LLM settings.

Usage (from apps/fastapi):
    python scripts/check_openai_nav.py

Exit codes:
    0 = OpenAI key works
    1 = key missing or request failed
"""
from __future__ import annotations

import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

import openai

from app.core.config import settings


def _mask_key(key: str) -> str:
    key = key.strip()
    if len(key) <= 12:
        return "***"
    return f"{key[:7]}...{key[-4:]}"


def check_openai() -> int:
    print("=" * 60)
    print("OpenAI Navigation Assistant - Health Check")
    print("=" * 60)

    api_key = (settings.OPENAI_API_KEY or "").strip()
    model = (settings.OPENAI_MODEL or "gpt-4o-mini").strip()
    base_url = (settings.OPENAI_BASE_URL or "").strip() or None
    max_out = getattr(settings, "AI_NAV_MAX_OUTPUT_TOKENS", 150)
    candidate_limit = getattr(settings, "AI_NAV_LLM_CANDIDATE_LIMIT", 8)

    print(f"\nConfig:")
    print(f"  OPENAI_API_KEY : {_mask_key(api_key) if api_key else '(empty)'}")
    print(f"  OPENAI_MODEL   : {model}")
    print(f"  OPENAI_BASE_URL: {base_url or '(default)'}")
    print(f"  AI_NAV_MAX_OUTPUT_TOKENS   : {max_out}")
    print(f"  AI_NAV_LLM_CANDIDATE_LIMIT : {candidate_limit}")

    if not api_key:
        print("\nFAIL: OPENAI_API_KEY is not set in .env")
        return 1

    print("\nCalling OpenAI (minimal test, max 5 output tokens)...")
    client_kwargs: dict = {"api_key": api_key}
    if base_url:
        client_kwargs["base_url"] = base_url

    try:
        client = openai.OpenAI(**client_kwargs)
        resp = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": "Reply with exactly: OK"}],
            max_tokens=5,
            temperature=0,
        )
        text = (resp.choices[0].message.content or "").strip()
        usage = resp.usage
        prompt_t = getattr(usage, "prompt_tokens", None) or 0
        completion_t = getattr(usage, "completion_tokens", None) or 0
        total_t = getattr(usage, "total_tokens", None) or (prompt_t + completion_t)

        print("\nSUCCESS: OpenAI API is working")
        print(f"  Model reply : {text!r}")
        print(f"  Tokens      : prompt={prompt_t} completion={completion_t} total={total_t}")
        print(
            "\n  Navigation assistant will use OpenAI when local menu match fails."
        )
        print("  Watch FastAPI logs for: [AI-NAV] openai tokens ...")
        return 0

    except openai.AuthenticationError as e:
        print(f"\nFAIL: Invalid API key (401)\n  {e}")
        print("  Fix: update OPENAI_API_KEY in .env with a valid key from platform.openai.com")
        return 1

    except openai.RateLimitError as e:
        err = str(e).lower()
        print(f"\nFAIL: Rate limit / quota (429)\n  {e}")
        if "insufficient_quota" in err or "quota" in err:
            print("  Fix: add billing/credits at https://platform.openai.com/settings/organization/billing")
        else:
            print("  Fix: wait a moment and retry")
        return 1

    except openai.NotFoundError as e:
        print(f"\nFAIL: Model not found\n  {e}")
        print(f"  Fix: set OPENAI_MODEL to a model your account can use (e.g. gpt-4o-mini)")
        return 1

    except Exception as e:
        print(f"\nFAIL: {type(e).__name__}: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(check_openai())
