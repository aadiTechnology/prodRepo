"""
Check NVIDIA API key (nvapi-...) via integrate.api.nvidia.com.

Usage (from apps/fastapi):
    set NVIDIA_API_KEY=nvapi-your-key-here
    python scripts/check_nvidia_api.py

    python scripts/check_nvidia_api.py --key nvapi-your-key-here
    python scripts/check_nvidia_api.py --model meta/llama-3.1-8b-instruct

Exit codes:
    0 = key works
    1 = missing key or request failed
"""
from __future__ import annotations

import argparse
import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

import openai

DEFAULT_BASE_URL = "https://integrate.api.nvidia.com/v1"
DEFAULT_MODEL = "meta/llama-3.1-8b-instruct"


def _mask_key(key: str) -> str:
    key = key.strip()
    if len(key) <= 12:
        return "***"
    return f"{key[:10]}...{key[-4:]}"


def _pick_model(client: openai.OpenAI, preferred: str | None) -> str:
    if preferred:
        return preferred
    try:
        models = client.models.list()
        ids = [m.id for m in models.data if m.id]
        if ids:
            for candidate in (
                "meta/llama-3.1-8b-instruct",
                "meta/llama-3.3-70b-instruct",
                "nvidia/llama-3.2-3b-instruct",
            ):
                if candidate in ids:
                    return candidate
            return ids[0]
    except Exception:
        pass
    return DEFAULT_MODEL


def check_nvidia_api(api_key: str, base_url: str, model: str | None) -> int:
    print("=" * 60)
    print("NVIDIA API (NVAPI) - Health Check")
    print("=" * 60)

    if not api_key.strip():
        print("\nFAIL: No API key provided.")
        print("  Set NVIDIA_API_KEY in .env or pass --key nvapi-...")
        return 1

    if not api_key.strip().startswith("nvapi-"):
        print(f"\nWARN: Key does not start with 'nvapi-' (got {_mask_key(api_key)})")

    print(f"\nConfig:")
    print(f"  NVIDIA_API_KEY : {_mask_key(api_key)}")
    print(f"  Base URL       : {base_url}")

    client = openai.OpenAI(api_key=api_key.strip(), base_url=base_url)

    print("\nStep 1: List models...")
    try:
        listed = client.models.list()
        model_ids = [m.id for m in listed.data[:8]]
        print(f"  OK - found {len(listed.data)} model(s)")
        if model_ids:
            print(f"  Sample: {', '.join(model_ids[:5])}")
    except openai.AuthenticationError as e:
        print(f"\nFAIL: Invalid API key (401)\n  {e}")
        return 1
    except Exception as e:
        print(f"  WARN: Could not list models ({type(e).__name__}: {e})")

    chosen = _pick_model(client, model)
    print(f"\nStep 2: Chat test with model '{chosen}' (max 10 tokens)...")

    try:
        resp = client.chat.completions.create(
            model=chosen,
            messages=[{"role": "user", "content": "Reply with exactly: OK"}],
            max_tokens=10,
            temperature=0,
        )
        text = (resp.choices[0].message.content or "").strip()
        usage = resp.usage
        prompt_t = getattr(usage, "prompt_tokens", None) or 0
        completion_t = getattr(usage, "completion_tokens", None) or 0
        total_t = getattr(usage, "total_tokens", None) or (prompt_t + completion_t)

        print("\nSUCCESS: NVIDIA API key is working")
        print(f"  Model reply : {text!r}")
        print(f"  Tokens      : prompt={prompt_t} completion={completion_t} total={total_t}")
        print("\n  Get keys: https://build.nvidia.com/")
        return 0

    except openai.AuthenticationError as e:
        print(f"\nFAIL: Invalid API key (401)\n  {e}")
        return 1

    except openai.RateLimitError as e:
        print(f"\nFAIL: Rate limit (429)\n  {e}")
        print("  Fix: wait and retry, or check usage limits on build.nvidia.com")
        return 1

    except openai.NotFoundError as e:
        print(f"\nFAIL: Model not found\n  {e}")
        print(f"  Fix: pass --model with a model from Step 1 list")
        return 1

    except Exception as e:
        print(f"\nFAIL: {type(e).__name__}: {e}")
        return 1


def main() -> int:
    parser = argparse.ArgumentParser(description="Test NVIDIA NVAPI key")
    parser.add_argument(
        "--key",
        help="NVIDIA API key (nvapi-...). Defaults to NVIDIA_API_KEY env var.",
    )
    parser.add_argument(
        "--base-url",
        default=os.getenv("NVIDIA_BASE_URL", DEFAULT_BASE_URL),
        help=f"API base URL (default: {DEFAULT_BASE_URL})",
    )
    parser.add_argument(
        "--model",
        default=os.getenv("NVIDIA_MODEL"),
        help="Model id (default: auto-pick from catalog)",
    )
    args = parser.parse_args()

    from dotenv import load_dotenv

    load_dotenv(os.getenv("ENV_FILE", ".env"))
    api_key = (args.key or os.getenv("NVIDIA_API_KEY") or "").strip()

    return check_nvidia_api(api_key, args.base_url, args.model)


if __name__ == "__main__":
    sys.exit(main())
