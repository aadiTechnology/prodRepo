"""
Diagnose (and optionally fix) Digital Marketing Hub sort_order error data.

Error data:
  - sort_order < 1
  - duplicate sort_order values (two platforms cannot share a slot)

Fix rule (keeps existing unique positions):
  - First occupant of a number (lowest id) keeps it
  - Duplicates and invalid rows take the next unused numbers (max+1, ...)

Also reports what Add Platform should default to (max + 1).

Usage (from apps/fastapi):
    python scripts/diagnose_fix_marketing_platform_sort_order.py
    python scripts/diagnose_fix_marketing_platform_sort_order.py --dry-run
    python scripts/diagnose_fix_marketing_platform_sort_order.py --fix
"""
from __future__ import annotations

import argparse
import os
import sys
from collections import defaultdict

current_dir = os.path.dirname(os.path.abspath(__file__))
fastapi_root = os.path.dirname(current_dir)
if fastapi_root not in sys.path:
    sys.path.insert(0, fastapi_root)

from dotenv import load_dotenv

load_dotenv(os.getenv("ENV_FILE", os.path.join(fastapi_root, ".env")))

from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.marketing_hub import MarketingPlatform


def _print(msg: str = "") -> None:
    print(msg.encode("ascii", "replace").decode("ascii"))


def _sort_value(platform: MarketingPlatform) -> int:
    return int(platform.sort_order or 0)


def load_platforms(db: Session) -> list[MarketingPlatform]:
    return (
        db.query(MarketingPlatform)
        .order_by(MarketingPlatform.sort_order.asc(), MarketingPlatform.id.asc())
        .all()
    )


def diagnose(platforms: list[MarketingPlatform]) -> tuple[list[str], int]:
    fails: list[str] = []
    if not platforms:
        _print("No marketing_platforms rows.")
        return fails, 1

    _print("Current catalog:")
    _print(f"  {'id':>5}  {'order':>5}  {'active':<6}  name (code)")
    for row in platforms:
        flag = "yes" if row.is_active else "no"
        _print(
            f"  {row.id:>5}  {_sort_value(row):>5}  {flag:<6}  "
            f"{row.name} ({row.code})"
        )

    invalid = [p for p in platforms if _sort_value(p) < 1]
    grouped: dict[int, list[MarketingPlatform]] = defaultdict(list)
    for row in platforms:
        grouped[_sort_value(row)].append(row)

    duplicates = {
        order: rows
        for order, rows in grouped.items()
        if order >= 1 and len(rows) > 1
    }

    if invalid:
        names = ", ".join(f"{p.name!r}={_sort_value(p)}" for p in invalid)
        fails.append(f"Invalid sort_order (< 1): {names}")

    for order, rows in sorted(duplicates.items()):
        names = ", ".join(f"{p.name!r}(id={p.id})" for p in rows)
        fails.append(f"Duplicate sort_order={order}: {names}")

    max_order = max((_sort_value(p) for p in platforms), default=0)
    next_order = max(max_order, 0) + 1
    _print("")
    _print(f"Max sort_order = {max_order}")
    _print(f"Add Platform should default to next sort_order = {next_order}")
    return fails, next_order


def planned_fixes(platforms: list[MarketingPlatform]) -> list[tuple[MarketingPlatform, int, int]]:
    """Return (platform, old, new) for rows that must move."""
    keepers: dict[int, MarketingPlatform] = {}
    displaced: list[MarketingPlatform] = []

    for row in sorted(platforms, key=lambda p: (p.id or 0)):
        order = _sort_value(row)
        if order < 1:
            displaced.append(row)
            continue
        if order in keepers:
            displaced.append(row)
            continue
        keepers[order] = row

    used = set(keepers)
    next_free = (max(used) if used else 0) + 1
    changes: list[tuple[MarketingPlatform, int, int]] = []
    for row in displaced:
        while next_free in used:
            next_free += 1
        old = _sort_value(row)
        if old != next_free:
            changes.append((row, old, next_free))
        used.add(next_free)
        next_free += 1
    return changes


def apply_fixes(
    db: Session,
    changes: list[tuple[MarketingPlatform, int, int]],
    *,
    dry_run: bool,
) -> None:
    for platform, _old, new_order in changes:
        platform.sort_order = new_order
    if dry_run:
        db.rollback()
        return
    db.commit()


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Diagnose/fix marketing platform sort_order duplicates"
    )
    parser.add_argument(
        "--fix",
        action="store_true",
        help="Apply unique sort_order values (keeps first occupant of each number)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show planned fixes without saving (implies diagnose)",
    )
    args = parser.parse_args()

    _print("=" * 72)
    _print("MARKETING PLATFORM SORT ORDER  (error data)")
    _print("=" * 72)

    db = SessionLocal()
    try:
        platforms = load_platforms(db)
        fails, _next_order = diagnose(platforms)
        changes = planned_fixes(platforms)

        _print("")
        _print("-- Findings")
        if not fails:
            _print("  INFO  No duplicate or invalid sort_order rows")
        for line in fails:
            _print(f"  FAIL  {line}")

        _print("")
        _print("-- Planned unique-slot fixes")
        if not changes:
            _print("  (none)")
        for platform, old, new in changes:
            flag = "active" if platform.is_active else "inactive"
            _print(f"  {platform.name!r} ({flag}, id={platform.id}): {old} -> {new}")

        if args.fix or args.dry_run:
            apply_fixes(db, changes, dry_run=args.dry_run or not args.fix)
            if args.dry_run and not args.fix:
                _print("")
                _print(f"Dry run only. {len(changes)} row(s) would change.")
                _print("Re-run with --fix to save.")
            elif args.fix and not args.dry_run:
                _print("")
                _print(f"Saved. Updated {len(changes)} row(s).")
                platforms = load_platforms(db)
                fails_after, next_after = diagnose(platforms)
                if fails_after:
                    _print("RESULT: FIX INCOMPLETE")
                    return 1
                _print(f"RESULT: OK  next Add Platform sort_order = {next_after}")
                return 0

        _print("")
        if fails:
            _print("RESULT: ERROR DATA PRESENT")
            _print("Run: python scripts/diagnose_fix_marketing_platform_sort_order.py --fix")
            return 1
        _print("RESULT: NO ERROR DATA")
        return 0
    except Exception as exc:
        db.rollback()
        _print(f"ERROR: {exc}")
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
