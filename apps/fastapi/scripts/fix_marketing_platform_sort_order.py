"""
Renumber marketing_platforms.sort_order properly into range 1..15:
  - Active platforms -> 1, 2, 3, ... (display order on Digital Marketing Hub)
  - Inactive (soft-deleted) platforms -> continue after actives while room remains
  - Valid sort_order range is 1-15 (MAX_SORT_ORDER)

Preferred order for known catalog codes, then remaining actives by name.

Usage (from apps/fastapi):
    python scripts/fix_marketing_platform_sort_order.py
    python scripts/fix_marketing_platform_sort_order.py --dry-run
"""
from __future__ import annotations

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.marketing_hub import MarketingPlatform

MAX_SORT_ORDER = 15

# Canonical hub order for default catalog platforms
PREFERRED_CODE_ORDER = [
    "instagram",
    "facebook",
    "youtube",
    "meta_ads",
    "google_ads",
    "whatsapp",
    "email_campaign",
    "canva",
    "brochure",
    "school_website",
    "google_review",
]


def _active_sort_key(platform: MarketingPlatform) -> tuple:
    code = (platform.code or "").strip().lower()
    try:
        preferred_rank = PREFERRED_CODE_ORDER.index(code)
    except ValueError:
        preferred_rank = len(PREFERRED_CODE_ORDER)
    return (preferred_rank, (platform.name or "").lower(), platform.id)


def fix_sort_orders(db: Session, *, dry_run: bool = False) -> list[tuple[str, bool, int, int]]:
    """Return (name, is_active, old_sort, new_sort). Commits unless dry_run.

    Active platforms get 1..N (N <= 15). Inactive fill remaining slots up to 15,
    then continue 16+ only if more inactive remain (warned by caller).
    """
    active = (
        db.query(MarketingPlatform)
        .filter(MarketingPlatform.is_active == True)  # noqa: E712
        .all()
    )
    inactive = (
        db.query(MarketingPlatform)
        .filter(MarketingPlatform.is_active == False)  # noqa: E712
        .order_by(MarketingPlatform.name.asc(), MarketingPlatform.id.asc())
        .all()
    )

    if len(active) > MAX_SORT_ORDER:
        raise SystemExit(
            f"ERROR: {len(active)} active platforms exceed max sort range "
            f"1-{MAX_SORT_ORDER}. Deactivate extras before renumbering."
        )

    active_sorted = sorted(active, key=_active_sort_key)

    changes: list[tuple[str, bool, int, int]] = []
    next_order = 1

    for platform in active_sorted:
        old = int(platform.sort_order or 0)
        if old != next_order:
            changes.append((platform.name, True, old, next_order))
        platform.sort_order = next_order
        next_order += 1

    for platform in inactive:
        old = int(platform.sort_order or 0)
        # Prefer staying in 1-15; if full, continue past 15 so rows stay unique
        new_order = next_order
        if old != new_order:
            changes.append((platform.name, False, old, new_order))
        platform.sort_order = new_order
        next_order += 1

    if not dry_run:
        db.commit()

    return changes


def main() -> None:
    parser = argparse.ArgumentParser(
        description=f"Renumber marketing platform sort_order into 1-{MAX_SORT_ORDER}"
    )
    parser.add_argument("--dry-run", action="store_true", help="Print changes without saving")
    args = parser.parse_args()

    db: Session = SessionLocal()
    try:
        active = (
            db.query(MarketingPlatform)
            .filter(MarketingPlatform.is_active == True)  # noqa: E712
            .all()
        )
        inactive = (
            db.query(MarketingPlatform)
            .filter(MarketingPlatform.is_active == False)  # noqa: E712
            .all()
        )
        print(f"Active platforms: {len(active)}")
        print(f"Inactive platforms: {len(inactive)}")
        print(f"Target sort_order range: 1-{MAX_SORT_ORDER}")

        preview_active = sorted(active, key=_active_sort_key)
        print(f"\nActive order (will become 1..{len(preview_active)}):")
        for index, platform in enumerate(preview_active, start=1):
            print(
                f"  {index}. {platform.name!r} "
                f"(was {platform.sort_order}, code={platform.code})"
            )

        if inactive:
            print("\nInactive (after actives):")
            for platform in sorted(inactive, key=lambda p: ((p.name or "").lower(), p.id)):
                print(f"  - {platform.name!r} (was {platform.sort_order}, code={platform.code})")

        changes = fix_sort_orders(db, dry_run=args.dry_run)

        print("\nChanges:")
        if not changes:
            print("  (none — already correct)")
        for name, is_active, old, new in changes:
            flag = "active" if is_active else "inactive"
            print(f"  {name!r} ({flag}): {old} -> {new}")

        over = [
            p
            for p in db.query(MarketingPlatform).all()
            if int(p.sort_order or 0) < 1 or int(p.sort_order or 0) > MAX_SORT_ORDER
        ]
        if over:
            print(
                f"\nWARNING: {len(over)} platform(s) still outside 1-{MAX_SORT_ORDER} "
                "(usually inactive overflow)."
            )
            for p in over:
                print(f"  - {p.name!r} sort_order={p.sort_order} active={p.is_active}")

        if args.dry_run:
            print(
                f"\nDry run only. {len(changes)} row(s) would change. "
                "Re-run without --dry-run to save."
            )
            db.rollback()
        else:
            print(f"\nSaved. Updated {len(changes)} row(s).")
            print(f"Hub list should now show active platforms as sort 1..N (max {MAX_SORT_ORDER}).")
    except SystemExit:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        print(f"ERROR: {exc}")
        raise SystemExit(1) from exc
    finally:
        db.close()


if __name__ == "__main__":
    main()
