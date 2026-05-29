"""
Verify teacher assignment + legacy class/division data for attendance features.

Usage (from repo root):
  python apps/fastapi/app/scripts/verify_teacher_attendance_data.py
  python apps/fastapi/app/scripts/verify_teacher_attendance_data.py --tenant-id 20 --academic-year-id 20
"""

from __future__ import annotations

import argparse
import os
import sys
from collections import defaultdict
from dataclasses import dataclass
from typing import Optional

from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.orm import Session

# Load .env and app imports
_repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
_fastapi_root = os.path.join(_repo_root, "apps", "fastapi")
load_dotenv(dotenv_path=os.path.join(_fastapi_root, ".env"))
sys.path.insert(0, _fastapi_root)

from app.core.database import SessionLocal  # noqa: E402


@dataclass
class CheckResult:
    name: str
    passed: bool
    detail: str


def _fetch_tenant_name(db: Session, tenant_id: int) -> str:
    row = db.execute(
        text("SELECT name FROM dbo.tenants WHERE id = :id"),
        {"id": tenant_id},
    ).mappings().first()
    return row["name"] if row else f"tenant_{tenant_id}"


def run_checks(db: Session, tenant_id: int, academic_year_id: int) -> list[CheckResult]:
    results: list[CheckResult] = []

    teachers = db.execute(
        text(
            """
            SELECT id, full_name, email, user_id, class_id, class_division_id, is_active
            FROM dbo.teachers
            WHERE tenant_id = :tenant_id AND is_deleted = 0
            ORDER BY full_name
            """
        ),
        {"tenant_id": tenant_id},
    ).mappings().all()

    active_teachers = [t for t in teachers if t["is_active"]]
    assignments = db.execute(
        text(
            """
            SELECT
                ta.id, ta.teacher_id, ta.class_id, ta.class_division_id,
                ta.academic_year_id, ta.subject_id,
                c.name AS class_name, cd.division_name
            FROM dbo.teacher_assignments ta
            LEFT JOIN dbo.classes c ON c.id = ta.class_id
            LEFT JOIN dbo.class_divisions cd ON cd.id = ta.class_division_id
            WHERE ta.tenant_id = :tenant_id
              AND ta.academic_year_id = :academic_year_id
              AND ta.is_active = 1
            ORDER BY ta.teacher_id, ta.id
            """
        ),
        {"tenant_id": tenant_id, "academic_year_id": academic_year_id},
    ).mappings().all()

    by_teacher: dict[int, list] = defaultdict(list)
    for a in assignments:
        by_teacher[a["teacher_id"]].append(a)

    assigned_teacher_ids = set(by_teacher.keys())
    active_ids = {t["id"] for t in active_teachers}

    # --- Check 1: assigned teachers have legacy columns ---
    missing_legacy = []
    for tid in assigned_teacher_ids:
        t = next((x for x in active_teachers if x["id"] == tid), None)
        if not t:
            continue
        if t["class_id"] is None or t["class_division_id"] is None:
            missing_legacy.append(t["full_name"])

    results.append(
        CheckResult(
            "Assigned teachers have legacy class_id + class_division_id",
            len(missing_legacy) == 0,
            "OK"
            if not missing_legacy
            else f"Missing legacy for: {', '.join(missing_legacy)}",
        )
    )

    # --- Check 2: legacy matches at least one active assignment ---
    legacy_mismatch = []
    for tid in assigned_teacher_ids:
        t = next((x for x in active_teachers if x["id"] == tid), None)
        if not t or t["class_id"] is None:
            continue
        rows = by_teacher[tid]
        matches = any(
            r["class_id"] == t["class_id"] and r["class_division_id"] == t["class_division_id"]
            for r in rows
        )
        if not matches:
            legacy_mismatch.append(
                f"{t['full_name']} legacy=({t['class_id']},{t['class_division_id']}) "
                f"not in assignments"
            )

    results.append(
        CheckResult(
            "Legacy class/division exists in teacher_assignments",
            len(legacy_mismatch) == 0,
            "OK" if not legacy_mismatch else "; ".join(legacy_mismatch),
        )
    )

    # --- Check 3: unassigned active teachers ---
    unassigned = [
        t["full_name"]
        for t in active_teachers
        if t["id"] not in assigned_teacher_ids
        and (t["class_id"] is None or t["class_division_id"] is None)
    ]
    results.append(
        CheckResult(
            "Unassigned teachers documented (should not appear in Mark Attendance)",
            True,
            f"{len(unassigned)} unassigned: {', '.join(unassigned) if unassigned else 'none'}",
        )
    )

    # --- Check 4: assigned teachers have user_id ---
    no_user = [
        t["full_name"]
        for t in active_teachers
        if t["id"] in assigned_teacher_ids and not t["user_id"]
    ]
    results.append(
        CheckResult(
            "Assigned teachers linked to users (user_id)",
            len(no_user) == 0,
            "OK" if not no_user else f"No user_id: {', '.join(no_user)}",
        )
    )

    # --- Check 5: no duplicate assignment rows ---
    dupes = db.execute(
        text(
            """
            SELECT teacher_id, class_id, class_division_id, COUNT(*) AS cnt
            FROM dbo.teacher_assignments
            WHERE tenant_id = :tenant_id
              AND academic_year_id = :academic_year_id
              AND is_active = 1
            GROUP BY teacher_id, class_id, class_division_id
            HAVING COUNT(*) > 1
            """
        ),
        {"tenant_id": tenant_id, "academic_year_id": academic_year_id},
    ).mappings().all()
    results.append(
        CheckResult(
            "No duplicate teacher+class+division assignments",
            len(dupes) == 0,
            "OK" if not dupes else f"{len(dupes)} duplicate group(s)",
        )
    )

    # --- Check 6: assignment FK integrity ---
    bad_fk = [
        a
        for a in assignments
        if a["class_name"] is None or a["division_name"] is None
    ]
    results.append(
        CheckResult(
            "All assignments reference valid class and division",
            len(bad_fk) == 0,
            "OK" if not bad_fk else f"{len(bad_fk)} broken assignment row(s)",
        )
    )

    # --- Check 7: multi-class teachers flagged (informational) ---
    multi = []
    for tid, rows in by_teacher.items():
        class_divs = {(r["class_id"], r["class_division_id"]) for r in rows}
        if len(class_divs) > 1:
            t = next((x for x in active_teachers if x["id"] == tid), None)
            name = t["full_name"] if t else str(tid)
            legacy = (
                f"legacy={t['class_id']}/{t['class_division_id']}"
                if t and t["class_id"]
                else "legacy=NULL"
            )
            parts = ", ".join(f"{r['class_name']}-{r['division_name']}" for r in rows)
            multi.append(f"{name} ({legacy}) -> [{parts}]")

    results.append(
        CheckResult(
            "Multi-class teachers (app must use teacher_assignments, not legacy only)",
            True,
            "; ".join(multi) if multi else "none",
        )
    )

    # --- Check 8: expected counts for ShantiNiketan-style setup ---
    results.append(
        CheckResult(
            "Active teachers count",
            True,
            f"{len(active_teachers)} active",
        )
    )
    results.append(
        CheckResult(
            "Teachers with assignments (Mark Attendance dropdown size)",
            len(assigned_teacher_ids & active_ids) >= 1,
            f"{len(assigned_teacher_ids & active_ids)} teacher(s) with assignments",
        )
    )

    return results


def print_teacher_table(db: Session, tenant_id: int, academic_year_id: int) -> None:
    rows = db.execute(
        text(
            """
            SELECT
                t.id,
                t.full_name,
                t.class_id,
                t.class_division_id,
                lc.name AS legacy_class,
                lcd.division_name AS legacy_division,
                (
                    SELECT COUNT(*)
                    FROM dbo.teacher_assignments ta
                    WHERE ta.teacher_id = t.id
                      AND ta.tenant_id = :tenant_id
                      AND ta.academic_year_id = :academic_year_id
                      AND ta.is_active = 1
                ) AS assignment_count
            FROM dbo.teachers t
            LEFT JOIN dbo.classes lc ON lc.id = t.class_id
            LEFT JOIN dbo.class_divisions lcd ON lcd.id = t.class_division_id
            WHERE t.tenant_id = :tenant_id
              AND t.is_deleted = 0
              AND t.is_active = 1
            ORDER BY t.full_name
            """
        ),
        {"tenant_id": tenant_id, "academic_year_id": academic_year_id},
    ).mappings().all()

    print("\n--- Active teachers (legacy + assignment count) ---")
    print(f"{'ID':<5} {'Name':<22} {'Legacy class':<14} {'Div':<4} {'#Asgn':<6}")
    print("-" * 55)
    for r in rows:
        print(
            f"{r['id']:<5} {r['full_name']:<22} "
            f"{(r['legacy_class'] or '-'):<14} {(r['legacy_division'] or '-'):<4} "
            f"{r['assignment_count']:<6}"
        )

    assign_rows = db.execute(
        text(
            """
            SELECT t.full_name, c.name AS class_name, cd.division_name, s.name AS subject
            FROM dbo.teacher_assignments ta
            INNER JOIN dbo.teachers t ON t.id = ta.teacher_id
            INNER JOIN dbo.classes c ON c.id = ta.class_id
            INNER JOIN dbo.class_divisions cd ON cd.id = ta.class_division_id
            LEFT JOIN dbo.subjects s ON s.id = ta.subject_id
            WHERE ta.tenant_id = :tenant_id
              AND ta.academic_year_id = :academic_year_id
              AND ta.is_active = 1
            ORDER BY t.full_name, c.name, cd.division_name
            """
        ),
        {"tenant_id": tenant_id, "academic_year_id": academic_year_id},
    ).mappings().all()

    print("\n--- teacher_assignments detail ---")
    for r in assign_rows:
        subj = r["subject"] or "(class teacher)"
        print(f"  {r['full_name']}: {r['class_name']}-{r['division_name']} [{subj}]")


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify teacher/attendance assignment data")
    parser.add_argument("--tenant-id", type=int, default=20)
    parser.add_argument("--academic-year-id", type=int, default=20)
    args = parser.parse_args()

    db: Optional[Session] = None
    try:
        db = SessionLocal()
        tenant_name = _fetch_tenant_name(db, args.tenant_id)
        print(f"Verifying tenant: {tenant_name} (id={args.tenant_id}), academic_year_id={args.academic_year_id}")

        results = run_checks(db, args.tenant_id, args.academic_year_id)
        print_teacher_table(db, args.tenant_id, args.academic_year_id)

        print("\n--- Verification results ---")
        failed = 0
        for r in results:
            status = "PASS" if r.passed else "FAIL"
            if not r.passed:
                failed += 1
            print(f"[{status}] {r.name}")
            print(f"         {r.detail}")

        print("\n" + ("=" * 50))
        if failed:
            print(f"OVERALL: FAILED ({failed} check(s) need attention)")
            return 1
        print("OVERALL: PASS — data looks correct for attendance (legacy sync OK)")
        print("Note: Multi-class teachers still need app fix to see all classes in UI.")
        return 0
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    finally:
        if db:
            db.close()


if __name__ == "__main__":
    raise SystemExit(main())
