"""
Check + repair data linked to INACTIVE classes/divisions.

Created because before inactive-class enforcement, the app allowed
students / fees / subjects / teacher assignments against inactive
classes. Those rows still exist in the DB after the code fix.

What this script does:
  CHECK (default, dry-run):
    - List inactive classes / divisions
    - Find still-ACTIVE operational rows pointing at them

  FIX (--fix):
    - Deactivate those operational rows (does NOT delete history)
    - Does NOT change students' class assignment (safe — they reappear
      when the class/division is activated again)
    - Does NOT reactivate inactive classes

Usage (from apps/fastapi):
    python scripts/fix_inactive_class_orphan_data.py
    python scripts/fix_inactive_class_orphan_data.py --tenant-id 1
    python scripts/fix_inactive_class_orphan_data.py --fix
    python scripts/fix_inactive_class_orphan_data.py --fix --tenant-id 1

Exit: 0 = clean (or fixed with no remaining issues), 1 = issues remain.
"""
from __future__ import annotations

import argparse
import os
import sys
from dataclasses import dataclass, field
from typing import Any, Optional

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from dotenv import load_dotenv

load_dotenv(os.getenv("ENV_FILE", ".env"))

from sqlalchemy import text
from sqlalchemy.exc import ProgrammingError, SQLAlchemyError

from app.core.database import SessionLocal


@dataclass
class Bucket:
    key: str
    title: str
    rows: list[dict[str, Any]] = field(default_factory=list)
    fixed: int = 0
    skipped: str = ""


def _print(msg: str = "") -> None:
    # Avoid Windows cp1252 crashes on fancy dashes
    print(msg.encode("ascii", "replace").decode("ascii"))


def _tenant_clause(alias: str, tenant_id: Optional[int]) -> str:
    if tenant_id is None:
        return "1=1"
    return f"{alias}.tenant_id = :tenant_id"


def _params(tenant_id: Optional[int]) -> dict[str, Any]:
    return {"tenant_id": tenant_id} if tenant_id is not None else {}


def _safe_all(db, sql: str, params: dict[str, Any]) -> list[dict[str, Any]]:
    try:
        return [dict(r) for r in db.execute(text(sql), params).mappings().all()]
    except ProgrammingError as exc:
        # Table may not exist in every environment
        _print(f"  [skip] query failed (table/column may be missing): {exc}")
        return []
    except SQLAlchemyError as exc:
        _print(f"  [skip] query error: {exc}")
        return []


def _safe_exec(db, sql: str, params: dict[str, Any]) -> int:
    try:
        result = db.execute(text(sql), params)
        return int(result.rowcount or 0)
    except ProgrammingError as exc:
        _print(f"  [skip] fix failed: {exc}")
        return 0
    except SQLAlchemyError as exc:
        _print(f"  [skip] fix error: {exc}")
        return 0


def list_inactive_classes(db, tenant_id: Optional[int]) -> list[dict[str, Any]]:
    sql = f"""
        SELECT c.id, c.name, c.tenant_id, c.academic_year_id, c.is_active
        FROM classes c
        WHERE c.is_deleted = 0
          AND c.is_active = 0
          AND {_tenant_clause('c', tenant_id)}
        ORDER BY c.tenant_id, c.name
    """
    return _safe_all(db, sql, _params(tenant_id))


def list_inactive_divisions(db, tenant_id: Optional[int]) -> list[dict[str, Any]]:
    sql = f"""
        SELECT
            cd.id,
            cd.division_name,
            cd.class_id,
            c.name AS class_name,
            c.tenant_id,
            cd.is_active AS division_active,
            c.is_active AS class_active
        FROM class_divisions cd
        INNER JOIN classes c ON c.id = cd.class_id
        WHERE c.is_deleted = 0
          AND cd.is_active = 0
          AND {_tenant_clause('c', tenant_id)}
        ORDER BY c.tenant_id, c.name, cd.division_name
    """
    return _safe_all(db, sql, _params(tenant_id))


def find_students(db, tenant_id: Optional[int]) -> list[dict[str, Any]]:
    """Students still assigned to inactive class OR inactive division."""
    sql = f"""
        SELECT
            s.id AS student_id,
            s.student_name,
            s.tenant_id,
            s.class_id,
            c.name AS class_name,
            c.is_active AS class_active,
            s.class_division_id,
            cd.division_name,
            cd.is_active AS division_active
        FROM students s
        LEFT JOIN classes c ON c.id = s.class_id
        LEFT JOIN class_divisions cd ON cd.id = s.class_division_id
        WHERE s.is_active = 1
          AND {_tenant_clause('s', tenant_id)}
          AND (
                (c.id IS NOT NULL AND c.is_deleted = 0 AND c.is_active = 0)
             OR (cd.id IS NOT NULL AND cd.is_active = 0)
          )
        ORDER BY s.tenant_id, s.id
    """
    return _safe_all(db, sql, _params(tenant_id))


def find_fee_structures(db, tenant_id: Optional[int]) -> list[dict[str, Any]]:
    sql = f"""
        SELECT
            fs.id,
            fs.name,
            fs.tenant_id,
            fs.class_id,
            c.name AS class_name,
            c.is_active AS class_active,
            fs.class_division_id,
            cd.division_name,
            cd.is_active AS division_active
        FROM fee_structures fs
        INNER JOIN classes c ON c.id = fs.class_id
        LEFT JOIN class_divisions cd ON cd.id = fs.class_division_id
        WHERE fs.is_deleted = 0
          AND fs.is_active = 1
          AND c.is_deleted = 0
          AND {_tenant_clause('fs', tenant_id)}
          AND (
                c.is_active = 0
             OR (cd.id IS NOT NULL AND cd.is_active = 0)
          )
        ORDER BY fs.tenant_id, fs.id
    """
    return _safe_all(db, sql, _params(tenant_id))


def find_fee_categories(db, tenant_id: Optional[int]) -> list[dict[str, Any]]:
    sql = f"""
        SELECT
            fc.id,
            fc.name,
            fc.tenant_id,
            fc.class_id,
            c.name AS class_name
        FROM fee_categories fc
        INNER JOIN classes c ON c.id = fc.class_id
        WHERE fc.status = 1
          AND (fc.deleted_at IS NULL)
          AND c.is_deleted = 0
          AND c.is_active = 0
          AND {_tenant_clause('fc', tenant_id)}
        ORDER BY fc.tenant_id, fc.name
    """
    return _safe_all(db, sql, _params(tenant_id))


def find_subject_mappings(db, tenant_id: Optional[int]) -> list[dict[str, Any]]:
    sql = f"""
        SELECT
            sc.id,
            sc.subject_id,
            sub.name AS subject_name,
            sc.tenant_id,
            sc.class_id,
            c.name AS class_name,
            c.is_active AS class_active,
            sc.class_division_id,
            cd.division_name,
            cd.is_active AS division_active
        FROM subject_classes sc
        INNER JOIN classes c ON c.id = sc.class_id
        LEFT JOIN class_divisions cd ON cd.id = sc.class_division_id
        LEFT JOIN subjects sub ON sub.id = sc.subject_id
        WHERE sc.is_active = 1
          AND c.is_deleted = 0
          AND {_tenant_clause('sc', tenant_id)}
          AND (
                c.is_active = 0
             OR (cd.id IS NOT NULL AND cd.is_active = 0)
          )
        ORDER BY sc.tenant_id, sc.id
    """
    return _safe_all(db, sql, _params(tenant_id))


def find_teacher_assignments(db, tenant_id: Optional[int]) -> list[dict[str, Any]]:
    sql = f"""
        SELECT
            ta.id,
            ta.tenant_id,
            ta.teacher_id,
            ta.class_id,
            c.name AS class_name,
            c.is_active AS class_active,
            ta.class_division_id,
            cd.division_name,
            cd.is_active AS division_active,
            ta.subject_id
        FROM teacher_assignments ta
        INNER JOIN classes c ON c.id = ta.class_id
        LEFT JOIN class_divisions cd ON cd.id = ta.class_division_id
        WHERE ta.is_active = 1
          AND c.is_deleted = 0
          AND {_tenant_clause('ta', tenant_id)}
          AND (
                c.is_active = 0
             OR (cd.id IS NOT NULL AND cd.is_active = 0)
          )
        ORDER BY ta.tenant_id, ta.id
    """
    return _safe_all(db, sql, _params(tenant_id))


def find_class_fee_assignments(db, tenant_id: Optional[int]) -> list[dict[str, Any]]:
    # class_fee_assignments has no tenant_id — join via classes
    sql = f"""
        SELECT
            cfa.id,
            cfa.class_id,
            c.name AS class_name,
            c.tenant_id,
            cfa.fee_structure_id,
            cfa.status,
            cfa.academic_year
        FROM class_fee_assignments cfa
        INNER JOIN classes c ON c.id = cfa.class_id
        WHERE UPPER(cfa.status) = 'ACTIVE'
          AND c.is_deleted = 0
          AND c.is_active = 0
          AND {_tenant_clause('c', tenant_id)}
        ORDER BY c.tenant_id, cfa.id
    """
    return _safe_all(db, sql, _params(tenant_id))


def fix_fee_structures(db, tenant_id: Optional[int]) -> int:
    sql = f"""
        UPDATE fs
        SET fs.is_active = 0,
            fs.updated_at = GETDATE()
        FROM fee_structures fs
        INNER JOIN classes c ON c.id = fs.class_id
        LEFT JOIN class_divisions cd ON cd.id = fs.class_division_id
        WHERE fs.is_deleted = 0
          AND fs.is_active = 1
          AND c.is_deleted = 0
          AND {_tenant_clause('fs', tenant_id)}
          AND (
                c.is_active = 0
             OR (cd.id IS NOT NULL AND cd.is_active = 0)
          )
    """
    return _safe_exec(db, sql, _params(tenant_id))


def fix_fee_categories(db, tenant_id: Optional[int]) -> int:
    sql = f"""
        UPDATE fc
        SET fc.status = 0,
            fc.updated_at = GETDATE()
        FROM fee_categories fc
        INNER JOIN classes c ON c.id = fc.class_id
        WHERE fc.status = 1
          AND (fc.deleted_at IS NULL)
          AND c.is_deleted = 0
          AND c.is_active = 0
          AND {_tenant_clause('fc', tenant_id)}
    """
    return _safe_exec(db, sql, _params(tenant_id))


def fix_subject_mappings(db, tenant_id: Optional[int]) -> int:
    sql = f"""
        UPDATE sc
        SET sc.is_active = 0
        FROM subject_classes sc
        INNER JOIN classes c ON c.id = sc.class_id
        LEFT JOIN class_divisions cd ON cd.id = sc.class_division_id
        WHERE sc.is_active = 1
          AND c.is_deleted = 0
          AND {_tenant_clause('sc', tenant_id)}
          AND (
                c.is_active = 0
             OR (cd.id IS NOT NULL AND cd.is_active = 0)
          )
    """
    return _safe_exec(db, sql, _params(tenant_id))


def fix_teacher_assignments(db, tenant_id: Optional[int]) -> int:
    sql = f"""
        UPDATE ta
        SET ta.is_active = 0,
            ta.updated_at = GETDATE()
        FROM teacher_assignments ta
        INNER JOIN classes c ON c.id = ta.class_id
        LEFT JOIN class_divisions cd ON cd.id = ta.class_division_id
        WHERE ta.is_active = 1
          AND c.is_deleted = 0
          AND {_tenant_clause('ta', tenant_id)}
          AND (
                c.is_active = 0
             OR (cd.id IS NOT NULL AND cd.is_active = 0)
          )
    """
    return _safe_exec(db, sql, _params(tenant_id))


def fix_class_fee_assignments(db, tenant_id: Optional[int]) -> int:
    sql = f"""
        UPDATE cfa
        SET cfa.status = 'INACTIVE',
            cfa.updated_at = GETDATE()
        FROM class_fee_assignments cfa
        INNER JOIN classes c ON c.id = cfa.class_id
        WHERE UPPER(cfa.status) = 'ACTIVE'
          AND c.is_deleted = 0
          AND c.is_active = 0
          AND {_tenant_clause('c', tenant_id)}
    """
    return _safe_exec(db, sql, _params(tenant_id))


def _show_rows(rows: list[dict[str, Any]], limit: int = 15) -> None:
    if not rows:
        _print("    (none)")
        return
    for row in rows[:limit]:
        parts = [f"{k}={v}" for k, v in row.items()]
        _print("    - " + ", ".join(parts))
    if len(rows) > limit:
        _print(f"    ... and {len(rows) - limit} more")


def run(tenant_id: Optional[int], do_fix: bool) -> int:
    db = SessionLocal()
    try:
        _print("=" * 72)
        _print("INACTIVE CLASS / DIVISION DATA CHECK" + (" + FIX" if do_fix else " (dry-run)"))
        _print("=" * 72)
        if tenant_id is not None:
            _print(f"Tenant filter: {tenant_id}")
        else:
            _print("Tenant filter: ALL")
        _print()

        inactive_classes = list_inactive_classes(db, tenant_id)
        inactive_divs = list_inactive_divisions(db, tenant_id)
        _print(f"Inactive classes: {len(inactive_classes)}")
        _show_rows(inactive_classes, limit=10)
        _print(f"Inactive divisions: {len(inactive_divs)}")
        _show_rows(inactive_divs, limit=10)
        _print()

        buckets = [
            Bucket(
                key="students",
                title="Active students assigned to inactive class/division (REPORT ONLY)",
                rows=find_students(db, tenant_id),
                skipped="Students are NOT auto-changed. Reactivate class/division to use them again, "
                "or manually transfer them after reactivate.",
            ),
            Bucket(
                key="fee_structures",
                title="Active fee structures on inactive class/division",
                rows=find_fee_structures(db, tenant_id),
            ),
            Bucket(
                key="fee_categories",
                title="Active fee categories on inactive class",
                rows=find_fee_categories(db, tenant_id),
            ),
            Bucket(
                key="subject_classes",
                title="Active subject mappings on inactive class/division",
                rows=find_subject_mappings(db, tenant_id),
            ),
            Bucket(
                key="teacher_assignments",
                title="Active teacher assignments on inactive class/division",
                rows=find_teacher_assignments(db, tenant_id),
            ),
            Bucket(
                key="class_fee_assignments",
                title="Active class fee assignments on inactive class",
                rows=find_class_fee_assignments(db, tenant_id),
            ),
        ]

        issue_count = 0
        for b in buckets:
            issue_count += len(b.rows)
            _print(f"-- {b.title}")
            _print(f"   found: {len(b.rows)}")
            _show_rows(b.rows)
            if b.skipped:
                _print(f"   note: {b.skipped}")
            _print()

        if do_fix:
            _print("-" * 72)
            _print("APPLYING FIXES (deactivate operational rows; students untouched)")
            _print("-" * 72)
            fixed_total = 0
            for key, fn in [
                ("fee_structures", fix_fee_structures),
                ("fee_categories", fix_fee_categories),
                ("subject_classes", fix_subject_mappings),
                ("teacher_assignments", fix_teacher_assignments),
                ("class_fee_assignments", fix_class_fee_assignments),
            ]:
                n = fn(db, tenant_id)
                fixed_total += n
                _print(f"  fixed {key}: {n}")
            db.commit()
            _print(f"  TOTAL rows updated: {fixed_total}")
            _print()

            # Re-check after fix
            remaining_ops = (
                len(find_fee_structures(db, tenant_id))
                + len(find_fee_categories(db, tenant_id))
                + len(find_subject_mappings(db, tenant_id))
                + len(find_teacher_assignments(db, tenant_id))
                + len(find_class_fee_assignments(db, tenant_id))
            )
            remaining_students = len(find_students(db, tenant_id))
            _print("After fix:")
            _print(f"  remaining operational orphans: {remaining_ops}")
            _print(f"  students still on inactive class/div (expected until transfer/reactivate): {remaining_students}")
            _print()
            if remaining_ops > 0:
                _print("VERDICT: operational issues remain - review manually")
                return 1
            _print("VERDICT: operational orphans cleaned.")
            if remaining_students:
                _print("  Students still assigned to inactive class/div are OK to keep;")
                _print("  they stay hidden until you reactivate or transfer them.")
            return 0

        # dry-run verdict
        ops = issue_count - len(buckets[0].rows)
        _print("=" * 72)
        if issue_count == 0:
            _print("VERDICT: CLEAN - no orphan data on inactive classes/divisions.")
            return 0
        _print(
            f"VERDICT: FOUND issues - students={len(buckets[0].rows)}, "
            f"operational={ops}"
        )
        _print("Re-run with --fix to deactivate fee/subject/teacher orphans.")
        _print("Students are reported only (safe).")
        return 1
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Check/fix data linked to inactive classes and divisions"
    )
    parser.add_argument("--tenant-id", type=int, default=None, help="Limit to one tenant")
    parser.add_argument(
        "--fix",
        action="store_true",
        help="Deactivate fee/subject/teacher orphans (students untouched)",
    )
    args = parser.parse_args()
    return run(tenant_id=args.tenant_id, do_fix=args.fix)


if __name__ == "__main__":
    raise SystemExit(main())
