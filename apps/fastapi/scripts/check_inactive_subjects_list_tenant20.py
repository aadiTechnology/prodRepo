"""
Diagnose why inactivated subjects may not appear on Subject List
for Shantiniketan (tenant_id=20).

Checks:
  1. Raw DB: subjects with is_active=0 / subject_classes.is_active=0
  2. API-equivalent: SubjectService.get_subjects(is_active=True/False/None)
     for each academic year (UI uses year dropdown, often 2026-2027)
  3. Reports mismatches: inactive subjects that Status=Inactive would miss

Usage:
  python scripts/check_inactive_subjects_list_tenant20.py
  python scripts/check_inactive_subjects_list_tenant20.py --tenant-id 20
  python scripts/check_inactive_subjects_list_tenant20.py --tenant-id 20 --year-id 20
  python scripts/check_inactive_subjects_list_tenant20.py --tenant-id 20 --fix

Exit 0 = OK (inactive subjects visible when is_active=False for their year)
Exit 1 = bug present (inactive subjects hidden from Inactive filter)
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

current_dir = Path(__file__).resolve().parent
fastapi_root = current_dir.parent
if str(fastapi_root) not in sys.path:
    sys.path.insert(0, str(fastapi_root))

from dotenv import load_dotenv
from sqlalchemy import text

load_dotenv(os.getenv("ENV_FILE", ".env"))

from app.core.database import SessionLocal
from app.services.subject_service import SubjectService


def _print(msg: str = "") -> None:
    print(msg.encode("ascii", "replace").decode("ascii"))


def _bool(v) -> bool:
    return bool(v) if v is not None else False


def list_years(db, tenant_id: int) -> list[dict]:
    rows = db.execute(
        text(
            """
            SELECT id, name, is_current, is_active
            FROM academic_years
            WHERE tenant_id = :tid AND is_deleted = 0
            ORDER BY id DESC
            """
        ),
        {"tid": tenant_id},
    ).mappings().all()
    return [dict(r) for r in rows]


def dump_raw_subjects(db, tenant_id: int) -> list[dict]:
    rows = db.execute(
        text(
            """
            SELECT
              s.id AS subject_id,
              s.name,
              s.code,
              s.subject_type,
              s.is_active AS subject_active,
              s.is_deleted,
              sc.id AS mapping_id,
              sc.class_id,
              c.name AS class_name,
              c.is_active AS class_active,
              sc.academic_year_id,
              ay.name AS year_name,
              sc.is_active AS mapping_active
            FROM subjects s
            LEFT JOIN subject_classes sc ON sc.subject_id = s.id
            LEFT JOIN classes c ON c.id = sc.class_id
            LEFT JOIN academic_years ay ON ay.id = sc.academic_year_id
            WHERE s.tenant_id = :tid
              AND s.is_deleted = 0
            ORDER BY s.is_active DESC, s.name, sc.class_id
            """
        ),
        {"tid": tenant_id},
    ).mappings().all()
    return [dict(r) for r in rows]


def check_year(db, tenant_id: int, year_id: int, year_name: str, raw: list[dict]) -> list[str]:
    issues: list[str] = []
    _print(f"\n--- Academic year {year_id} ({year_name}) ---")

    active_list, active_total = SubjectService.get_subjects(
        db, tenant_id, skip=0, limit=500, academic_year_id=year_id, is_active=True
    )
    inactive_list, inactive_total = SubjectService.get_subjects(
        db, tenant_id, skip=0, limit=500, academic_year_id=year_id, is_active=False
    )
    all_list, all_total = SubjectService.get_subjects(
        db, tenant_id, skip=0, limit=500, academic_year_id=year_id, is_active=None
    )

    _print(f"  Status=Active   -> {active_total}: {[s.name for s in active_list]}")
    _print(f"  Status=Inactive -> {inactive_total}: {[s.name for s in inactive_list]}")
    _print(f"  Status=All      -> {all_total}: {[s.name for s in all_list]}")

    year_inactive = {
        r["subject_id"]
        for r in raw
        if (
            not _bool(r["subject_active"])
            and r["academic_year_id"] is not None
            and int(r["academic_year_id"]) == year_id
        )
    }
    api_inactive_ids = {s.id for s in inactive_list}
    missing = year_inactive - api_inactive_ids

    if year_inactive and not missing:
        _print(f"  OK: {len(year_inactive)} inactive subject(s) visible under Status=Inactive")
    elif not year_inactive:
        _print("  (no inactive subjects mapped to this year)")
    else:
        for sid in sorted(missing):
            name = next(r["name"] for r in raw if r["subject_id"] == sid)
            msg = (
                f"BUG year={year_id}: inactive subject id={sid} '{name}' missing "
                f"from Status=Inactive API"
            )
            issues.append(msg)
            _print(f"  FAIL: {msg}")

    # Empty classes attachment = row may vanish from UI grouping
    for s in inactive_list:
        classes = getattr(s, "classes", None) or []
        if not classes:
            msg = (
                f"BUG year={year_id}: inactive subject id={s.id} '{s.name}' returned "
                f"but classes=[] — UI row will not show class/year"
            )
            issues.append(msg)
            _print(f"  FAIL: {msg}")

    return issues


def main() -> int:
    parser = argparse.ArgumentParser(description="Check inactive subject list visibility")
    parser.add_argument("--tenant-id", type=int, default=20)
    parser.add_argument("--year-id", type=int, default=None, help="Check one year only")
    parser.add_argument(
        "--fix",
        action="store_true",
        help="Sync subject_classes.is_active to match subjects.is_active",
    )
    args = parser.parse_args()
    tenant_id = args.tenant_id

    _print("=" * 72)
    _print(f"INACTIVE SUBJECT LIST CHECK — tenant_id={tenant_id}")
    _print("=" * 72)

    db = SessionLocal()
    all_issues: list[str] = []

    try:
        tenant = db.execute(
            text("SELECT id, name FROM tenants WHERE id = :tid"),
            {"tid": tenant_id},
        ).mappings().first()
        if not tenant:
            _print(f"ERROR: tenant {tenant_id} not found")
            return 1
        _print(f"Tenant: {tenant['name']} (id={tenant['id']})")

        years = list_years(db, tenant_id)
        _print("\nAcademic years:")
        for y in years:
            _print(
                f"  id={y['id']} name={y['name']} "
                f"current={y['is_current']} active={y['is_active']}"
            )

        raw = dump_raw_subjects(db, tenant_id)
        inactive_subjects = {r["subject_id"] for r in raw if not _bool(r["subject_active"])}
        active_subjects = {r["subject_id"] for r in raw if _bool(r["subject_active"])}

        _print(f"\n[1] RAW DB")
        _print(f"  Distinct ACTIVE subjects:   {len(active_subjects)}")
        _print(f"  Distinct INACTIVE subjects: {len(inactive_subjects)}")

        if inactive_subjects:
            _print("\n  Inactive subjects detail:")
            seen: set[int] = set()
            for r in raw:
                sid = r["subject_id"]
                if sid not in inactive_subjects or sid in seen:
                    continue
                seen.add(sid)
                maps = [x for x in raw if x["subject_id"] == sid]
                _print(f"    id={sid} {r['name']} ({r['code']}) type={r['subject_type']}")
                for m in maps:
                    _print(
                        f"      mapping_id={m['mapping_id']} class={m['class_name']} "
                        f"year={m['year_name']}(id={m['academic_year_id']}) "
                        f"mapping_active={m['mapping_active']} class_active={m['class_active']}"
                    )

        _print(f"\n[2] API get_subjects (same filters as Subject List UI)")
        years_to_check = years
        if args.year_id is not None:
            years_to_check = [y for y in years if int(y["id"]) == args.year_id]
            if not years_to_check:
                _print(f"ERROR: year-id {args.year_id} not found")
                return 1

        for y in years_to_check:
            all_issues.extend(
                check_year(db, tenant_id, int(y["id"]), str(y["name"]), raw)
            )

        if args.fix:
            _print("\n[3] FIX — sync subject_classes.is_active = subjects.is_active")
            result = db.execute(
                text(
                    """
                    UPDATE sc
                    SET sc.is_active = s.is_active
                    FROM subject_classes sc
                    INNER JOIN subjects s ON s.id = sc.subject_id
                    WHERE s.tenant_id = :tid
                      AND s.is_deleted = 0
                      AND sc.is_active <> s.is_active
                    """
                ),
                {"tid": tenant_id},
            )
            db.commit()
            _print(f"  Rows synced: {result.rowcount}")
            all_issues = []
            for y in years_to_check:
                all_issues.extend(
                    check_year(db, tenant_id, int(y["id"]), str(y["name"]), raw)
                )

        _print("\n[4] UI NOTE")
        _print("  Subject List year dropdown must match the subject's year")
        _print("  (ShantiNiketan inactive Maths/Social Sci are on 2026-2027 id=20).")
        _print("  Use Status = All or Inactive to see inactivated subjects.")
        _print("  Status = Active hides them on purpose.")

        _print("\n" + "=" * 72)
        if all_issues:
            _print("ISSUES FOUND:")
            for i, msg in enumerate(all_issues, 1):
                _print(f"  {i}. {msg}")
            _print("\nVERDICT: FAIL")
            return 1

        if inactive_subjects:
            _print(
                "VERDICT: OK — inactive subjects returned by API for their year. "
                "On UI: pick Academic Year 2026-2027 + Status All/Inactive."
            )
        else:
            _print("VERDICT: OK — no inactive subjects in DB")
        return 0

    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
