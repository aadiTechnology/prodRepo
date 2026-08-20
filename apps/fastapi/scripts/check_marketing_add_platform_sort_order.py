"""
Check Digital Marketing Hub Add Platform sort order.

Expected:
  - Add Platform prefills Sort Order with max(existing)+1
  - Changing that number to an occupied slot SWAPS (same as Edit)
    e.g. YouTube=1, new default=24, user saves 1 -> new=1, YouTube=24

Usage (from apps/fastapi):
    python scripts/check_marketing_add_platform_sort_order.py
    python scripts/check_marketing_add_platform_sort_order.py --skip-db
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

current_dir = os.path.dirname(os.path.abspath(__file__))
fastapi_root = Path(os.path.dirname(current_dir))
repo_apps = fastapi_root.parent
web_src = repo_apps / "web" / "src"

FORM_PAGE = web_src / "pages" / "marketing" / "MarketingPlatformFormPage.tsx"
FORM_CONFIG = web_src / "pages" / "marketing" / "MarketingPlatformFormPage.formConfig.tsx"
SERVICE_PY = fastapi_root / "app" / "services" / "marketing_hub_service.py"
ROUTER_PY = fastapi_root / "app" / "routers" / "marketing_hub.py"
API_TS = web_src / "api" / "services" / "marketingHubService.ts"


def _print(msg: str = "") -> None:
    print(msg.encode("ascii", "replace").decode("ascii"))


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def check_frontend(fails: list[str], infos: list[str]) -> None:
    if not FORM_PAGE.exists():
        fails.append(f"Missing form page: {FORM_PAGE}")
        return

    source = _read(FORM_PAGE)
    if "getNextSortOrder" in source or "loadNextSortOrder" in source:
        infos.append("Add Platform loads next sort order before showing the form")
    else:
        fails.append("Add Platform does not load next sort order")

    if API_TS.exists() and "getNextSortOrder" in _read(API_TS):
        infos.append("Frontend API has getNextSortOrder()")
    else:
        fails.append("marketingHubService.ts is missing getNextSortOrder()")

    if FORM_CONFIG.exists():
        cfg = _read(FORM_CONFIG)
        if "the two platforms swap" in cfg:
            infos.append("Add and Edit Sort Order helper text both describe swap")
        else:
            fails.append("Add Platform helper text does not describe swap")
        if "moves to the end" in cfg:
            fails.append("Add Platform helper still says occupant moves to the end")


def check_backend(fails: list[str], infos: list[str]) -> None:
    if not SERVICE_PY.exists():
        fails.append(f"Missing service: {SERVICE_PY}")
        return

    service = _read(SERVICE_PY)
    create_fn = service.split("def create_platform", 1)[1].split("\ndef ", 1)[0]
    if "previous_sort_order=vacated_sort_order" in create_fn.replace(" ", ""):
        infos.append("create_platform() swaps using the vacated next sort order")
    elif "previous_sort_order" in create_fn:
        infos.append("create_platform() passes previous_sort_order for swap")
    else:
        fails.append("create_platform() does not true-swap like Edit")

    if ROUTER_PY.exists() and "next-sort-order" in _read(ROUTER_PY):
        infos.append("GET /api/marketing/platforms/next-sort-order is registered")
    else:
        fails.append("Missing next-sort-order API route")


def check_database(fails: list[str], infos: list[str]) -> None:
    sys.path.insert(0, str(fastapi_root))
    from dotenv import load_dotenv

    load_dotenv(os.getenv("ENV_FILE", str(fastapi_root / ".env")))

    from collections import defaultdict

    from sqlalchemy import text

    from app.core.database import SessionLocal

    db = SessionLocal()
    try:
        rows = list(
            db.execute(
                text(
                    """
                    SELECT id, name, code, sort_order, is_active
                    FROM dbo.marketing_platforms
                    ORDER BY sort_order ASC, name ASC
                    """
                )
            ).mappings().all()
        )
    except Exception as exc:
        infos.append(f"DB skipped / failed: {exc}")
        return
    finally:
        db.close()

    if not rows:
        infos.append("No marketing_platforms rows; next sort_order = 1")
        return

    grouped: dict[int, list[str]] = defaultdict(list)
    max_order = 0
    for row in rows:
        order = int(row["sort_order"] or 0)
        max_order = max(max_order, order)
        grouped[order].append(str(row["name"]))
        if order < 1:
            fails.append(f"Invalid sort_order for {row['name']!r}: {order}")

    next_order = max_order + 1
    infos.append(f"Platforms in DB: {len(rows)}")
    infos.append(f"Expected Add Platform default = {next_order}")

    for order, names in sorted(grouped.items()):
        if order >= 1 and len(names) > 1:
            fails.append(f"Duplicate sort_order={order}: {', '.join(names)}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Check Add Platform sort order + swap")
    parser.add_argument("--skip-db", action="store_true")
    args = parser.parse_args()

    fails: list[str] = []
    infos: list[str] = []

    _print("=" * 72)
    _print("ADD PLATFORM SORT ORDER + SWAP  (Digital Marketing Hub)")
    _print("=" * 72)

    check_frontend(fails, infos)
    check_backend(fails, infos)
    if args.skip_db:
        infos.append("DB check skipped (--skip-db)")
    else:
        check_database(fails, infos)

    _print("")
    _print("-- Findings")
    for line in infos:
        _print(f"  INFO  {line}")
    for line in fails:
        _print(f"  FAIL  {line}")

    _print("")
    if fails:
        _print("RESULT: BUG / ERROR DATA PRESENT")
        return 1
    _print("RESULT: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
