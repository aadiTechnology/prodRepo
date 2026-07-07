"""
Check all AI provider keys configured in .env (OpenAI, NVIDIA, Gemini).

Usage (from apps/fastapi):
    python scripts/check_ai_providers.py

Exit code 0 if at least one provider works; 1 if all configured providers fail
or no keys are set.
"""
from __future__ import annotations

import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from dotenv import load_dotenv

load_dotenv(os.getenv("ENV_FILE", ".env"))

import openai

from app.core.config import settings

NVIDIA_DEFAULT_BASE = "https://integrate.api.nvidia.com/v1"
NVIDIA_DEFAULT_MODEL = "meta/llama-3.1-8b-instruct"
GEMINI_DEFAULT_MODEL = "gemini-2.5-flash"


def _mask(key: str) -> str:
    key = (key or "").strip()
    if len(key) <= 12:
        return "(empty)" if not key else "***"
    return f"{key[:8]}...{key[-4:]}"


def _header(title: str) -> None:
    print(f"\n{'-' * 60}")
    print(title)
    print("-" * 60)


def check_openai() -> str:
    _header("OpenAI (fallback when NVIDIA_API_KEY is not set)")
    key = (settings.OPENAI_API_KEY or "").strip()
    model = (settings.OPENAI_MODEL or "gpt-4o-mini").strip()
    base = (settings.OPENAI_BASE_URL or "").strip() or None
    print(f"  Key    : {_mask(key)}")
    print(f"  Model  : {model}")
    if not key:
        return "SKIP (not set in .env)"
    try:
        kwargs: dict = {"api_key": key}
        if base:
            kwargs["base_url"] = base
        client = openai.OpenAI(**kwargs)
        resp = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": "Say OK"}],
            max_tokens=5,
            temperature=0,
        )
        text = (resp.choices[0].message.content or "").strip()
        usage = resp.usage
        total = getattr(usage, "total_tokens", None) or 0
        print(f"  Status : OK - reply={text!r}, tokens={total}")
        return "OK"
    except openai.AuthenticationError:
        print("  Status : FAIL - invalid API key (401)")
        return "FAIL"
    except openai.RateLimitError as e:
        err = str(e).lower()
        if "insufficient_quota" in err or "quota" in err:
            print("  Status : FAIL - insufficient quota / no billing (429)")
            print("  Fix    : https://platform.openai.com/settings/organization/billing")
        else:
            print(f"  Status : FAIL - rate limited (429)")
        return "FAIL"
    except Exception as e:
        print(f"  Status : FAIL - {type(e).__name__}: {e}")
        return "FAIL"


def check_nvidia() -> str:
    _header("NVIDIA NVAPI (primary for Navigation Assistant when set)")
    key = (settings.NVIDIA_API_KEY or "").strip()
    base = (settings.NVIDIA_BASE_URL or NVIDIA_DEFAULT_BASE).strip()
    model = (settings.NVIDIA_MODEL or NVIDIA_DEFAULT_MODEL).strip()
    print(f"  Key    : {_mask(key)}")
    print(f"  Model  : {model}")
    if not key:
        return "SKIP (not set in .env - add NVIDIA_API_KEY=nvapi-...)"
    try:
        client = openai.OpenAI(api_key=key, base_url=base)
        resp = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": "Say OK"}],
            max_tokens=5,
            temperature=0,
        )
        text = (resp.choices[0].message.content or "").strip()
        usage = resp.usage
        total = getattr(usage, "total_tokens", None) or 0
        print(f"  Status : OK - reply={text!r}, tokens={total}")
        return "OK"
    except openai.AuthenticationError:
        print("  Status : FAIL - invalid API key (401)")
        return "FAIL"
    except openai.RateLimitError:
        print("  Status : FAIL - rate limit (429)")
        return "FAIL"
    except Exception as e:
        print(f"  Status : FAIL - {type(e).__name__}: {e}")
        return "FAIL"


def check_gemini() -> str:
    _header("Google Gemini (optional fallback)")
    key = (settings.GEMINI_API_KEY or "").strip()
    model = (settings.GEMINI_MODEL or GEMINI_DEFAULT_MODEL).strip()
    print(f"  Key    : {_mask(key)}")
    print(f"  Model  : {model}")
    if not key:
        return "SKIP (not set in .env)"
    try:
        import google.generativeai as genai  # pyright: ignore[reportMissingImports]

        genai.configure(api_key=key)
        m = genai.GenerativeModel(model)
        r = m.generate_content("Say OK")
        text = (r.text or "").strip()
        print(f"  Status : OK - reply={text!r}")
        return "OK"
    except Exception as e:
        err = str(e).lower()
        if "quota" in err or "resourceexhausted" in err:
            print("  Status : FAIL - quota exceeded")
        elif "api key" in err:
            print("  Status : FAIL - invalid API key")
        else:
            print(f"  Status : FAIL - {type(e).__name__}: {e}")
        return "FAIL"


def main() -> int:
    print("=" * 60)
    print("AI Provider Health Check (.env)")
    print("=" * 60)
    print("\nNavigation Assistant LLM priority: NVIDIA_API_KEY (if set) else OPENAI_API_KEY")

    results = {
        "OpenAI": check_openai(),
        "NVIDIA": check_nvidia(),
        "Gemini": check_gemini(),
    }

    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    for name, status in results.items():
        print(f"  {name:8} : {status}")

    working = [k for k, v in results.items() if v == "OK"]
    if working:
        print(f"\nWorking provider(s): {', '.join(working)}")
        if "OpenAI" not in working and results.get("OpenAI") == "FAIL" and results.get("NVIDIA") == "OK":
            print("\nAssistant will use NVIDIA (NVIDIA_API_KEY is set).")
        return 0

    if all(v.startswith("SKIP") for v in results.values()):
        print("\nNo API keys configured in .env.")
        return 1

    print("\nNo working provider. Fix billing/keys above.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
