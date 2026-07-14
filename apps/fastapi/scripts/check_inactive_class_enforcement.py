"""
Audit whether inactive school classes are correctly excluded from filters,
dropdowns, and write paths across Campus Axis.

Bug reported:
  - Class edit can set is_active=False (INACTIVE chip shows correctly on Classes page)
  - Inactive classes still appear in Student list filters, enrollment/edit/transfer,
    fee create, subject create, and many other class dropdowns
  - Users can assign / create records against inactive classes

Checks (static + optional DB):
  1. Backend class LIST APIs filter is_active?
  2. Backend WRITE paths reject inactive class_id?
  3. Frontend pages that load classes filter is_active before Select options?
  4. Known-good paths (homework teacher-classes, subject all_classes, dashboard)

Usage (from apps/fastapi):
    python scripts/check_inactive_class_enforcement.py
    python scripts/check_inactive_class_enforcement.py --with-db

Exit code 0 = no HIGH findings; 1 = HIGH gaps remain.
"""
from __future__ import annotations

import argparse
import os
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

current_dir = os.path.dirname(os.path.abspath(__file__))
fastapi_root = Path(os.path.dirname(current_dir))
repo_apps = fastapi_root.parent  # .../apps
web_src = repo_apps / "web" / "src"
fastapi_app = fastapi_root / "app"

# ── Severity model ───────────────────────────────────────────────────────────

SEVERITY_ORDER = {"HIGH": 0, "MED": 1, "LOW": 2, "OK": 3, "INFO": 4}


@dataclass
class Finding:
    severity: str  # HIGH | MED | LOW | OK | INFO
    area: str
    path: str
    detail: str


@dataclass
class Report:
    findings: list[Finding] = field(default_factory=list)

    def add(self, severity: str, area: str, path: str, detail: str) -> None:
        self.findings.append(Finding(severity, area, path, detail))

    @property
    def high_count(self) -> int:
        return sum(1 for f in self.findings if f.severity == "HIGH")

    @property
    def med_count(self) -> int:
        return sum(1 for f in self.findings if f.severity == "MED")


# ── Helpers ──────────────────────────────────────────────────────────────────

def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return ""


def rel(path: Path) -> str:
    try:
        return str(path.relative_to(repo_apps))
    except ValueError:
        return str(path)


def file_has(path: Path, *patterns: str) -> bool:
    text = read_text(path)
    return all(p in text for p in patterns)


def file_matches(path: Path, regex: str, flags: int = re.I | re.M) -> bool:
    return bool(re.search(regex, read_text(path), flags))


# ── Backend checks ───────────────────────────────────────────────────────────

def check_backend_list_apis(report: Report) -> None:
    """Class list endpoints must support filtering inactive; default leak is HIGH."""
    school_class_svc = fastapi_app / "services" / "school_class_service.py"
    text = read_text(school_class_svc)

    if not text:
        report.add("HIGH", "backend-list", rel(school_class_svc), "File missing")
        return

    # get_all_classes exists but does not filter is_active
    if "def get_all_classes" in text:
        # Look at function body roughly until next def
        m = re.search(
            r"def get_all_classes\([\s\S]*?(?=\ndef |\Z)",
            text,
        )
        body = m.group(0) if m else ""
        filters_active = bool(
            re.search(r"SchoolClass\.is_active\s*==\s*True|is_active\s*==\s*True", body)
        )
        has_active_only_param = "active_only" in body or "is_active" in (
            m.group(0).split(")", 1)[0] if m else ""
        )

        if filters_active or has_active_only_param:
            report.add(
                "OK",
                "backend-list",
                rel(school_class_svc),
                "get_all_classes filters or accepts active_only — good",
            )
        else:
            report.add(
                "HIGH",
                "backend-list",
                rel(school_class_svc),
                "get_all_classes() returns ALL non-deleted classes - no is_active filter. "
                "This feeds /api/classes and /academic/classes used by most dropdowns.",
            )

    # teacher assignment slim list
    teacher_assign = fastapi_app / "services" / "teacher_assignment_service.py"
    ta_text = read_text(teacher_assign)
    if ta_text:
        # get_classes SQL often only checks is_deleted
        if re.search(r"FROM\s+classes\s+c", ta_text, re.I):
            # check nearby for is_active
            snippets = re.findall(
                r"FROM\s+classes\s+c[\s\S]{0,400}",
                ta_text,
                re.I,
            )
            any_active = any("is_active" in s for s in snippets)
            if any_active:
                report.add(
                    "OK",
                    "backend-list",
                    rel(teacher_assign),
                    "Teacher-assignment class SQL filters is_active",
                )
            else:
                report.add(
                    "HIGH",
                    "backend-list",
                    rel(teacher_assign),
                    "Teacher-assignment get_classes SQL filters is_deleted only - "
                    "inactive classes appear in assign-teacher dropdowns.",
                )

    # Known-good homework path
    homework_repo = fastapi_app / "repositories" / "homework_repository.py"
    hw_text = read_text(homework_repo)
    if "SchoolClass.is_active" in hw_text or "c.is_active" in hw_text:
        report.add(
            "OK",
            "backend-list",
            rel(homework_repo),
            "Homework teacher-classes correctly filters is_active=1",
        )
    else:
        report.add(
            "MED",
            "backend-list",
            rel(homework_repo),
            "Expected homework class query to filter is_active — verify manually",
        )

    # Dashboard
    dashboard = fastapi_app / "routers" / "dashboard.py"
    if file_matches(dashboard, r"SchoolClass\.is_active\s*==\s*True"):
        report.add(
            "OK",
            "backend-list",
            rel(dashboard),
            "Dashboard class counts filter is_active",
        )


def check_backend_write_guards(report: Report) -> None:
    """Writes that accept class_id should reject inactive classes."""
    checks = [
        (
            fastapi_app / "services" / "student_service.py",
            "Student create/update",
            r"class_id",
            r"SchoolClass\.is_active|is_active\s*==\s*True",
        ),
        (
            fastapi_app / "services" / "fee_service.py",
            "Fee structure create",
            r"class_id|SchoolClass",
            r"SchoolClass\.is_active|is_active\s*==\s*True",
        ),
        (
            fastapi_app / "services" / "subject_service.py",
            "Subject class_mappings (explicit)",
            r"class_mappings|class_id",
            # all_classes path filters active; explicit may not
            r"class_mappings[\s\S]{0,800}is_active",
        ),
    ]

    for path, label, need_pat, guard_pat in checks:
        text = read_text(path)
        if not text:
            report.add("INFO", "backend-write", rel(path), f"{label}: file missing")
            continue
        if not re.search(need_pat, text, re.I):
            report.add("INFO", "backend-write", rel(path), f"{label}: no class_id usage found")
            continue

        # Fee: specifically look at target_class query
        if path.name == "fee_service.py":
            fee_ok = bool(
                re.search(
                    r"require_active_class|target_class\s*=[\s\S]{0,350}is_active",
                    text,
                    re.I,
                )
            )
            if fee_ok:
                report.add("OK", "backend-write", rel(path), f"{label}: rejects inactive class")
            else:
                report.add(
                    "HIGH",
                    "backend-write",
                    rel(path),
                    f"{label}: validates class exists/not-deleted but NOT is_active - "
                    "inactive class fee structures can be created via API.",
                )
            continue

        if path.name == "student_service.py":
            # Look for any inactive-class guard near add/update
            student_ok = bool(
                re.search(
                    r"(add_student|create|update_student|update)[\s\S]{0,2000}"
                    r"SchoolClass\.is_active",
                    text,
                    re.I,
                )
            ) or bool(
                re.search(
                    r"SchoolClass\.is_active\s*==\s*True",
                    text,
                )
            )
            if student_ok:
                report.add("OK", "backend-write", rel(path), f"{label}: rejects inactive class")
            else:
                report.add(
                    "HIGH",
                    "backend-write",
                    rel(path),
                    f"{label}: accepts any class_id - students can be enrolled / "
                    "transferred into an inactive class via API.",
                )
            continue

        if path.name == "subject_service.py":
            # all_classes path is good; class_mappings explicit path often not
            all_classes_ok = bool(
                re.search(
                    r"all_classes[\s\S]{0,400}is_active\s*==\s*True|"
                    r"SchoolClass\.is_active\s*==\s*True",
                    text,
                    re.I,
                )
            )
            explicit_ok = bool(re.search(guard_pat, text, re.I))
            if all_classes_ok:
                report.add(
                    "OK",
                    "backend-write",
                    rel(path),
                    "Subject all_classes=True path maps only active classes",
                )
            if not explicit_ok:
                report.add(
                    "HIGH",
                    "backend-write",
                    rel(path),
                    f"{label}: explicit class_id mappings do not require is_active - "
                    "subject create can target inactive classes.",
                )
            else:
                report.add(
                    "OK",
                    "backend-write",
                    rel(path),
                    f"{label}: appears to guard is_active on mappings",
                )


# ── Frontend checks ──────────────────────────────────────────────────────────

# Pages that INTENTIONALLY list inactive classes (class admin)
FRONTEND_ALLOWLIST = {
    "pages/academics/ClassList.tsx",
    "pages/academics/useClassListController.ts",
    "hooks/useClassListController.ts",
    "pages/academics/AddClass.tsx",
}

# Patterns that indicate loading a class list for UI options
LOAD_PATTERNS = [
    r"schoolClassService\s*\.\s*getAll\s*\(",
    r"classService\s*\.\s*list\s*\(",
    r"feeService\s*\.\s*getClasses\s*\(",
    r"getClasses\s*\(",
    r"/academic/classes",
    r"/api/classes",
]

# Patterns that indicate consumer filters active classes
FILTER_ACTIVE_PATTERNS = [
    r"\.filter\s*\(\s*(?:\([^)]*\)|[a-zA-Z_]\w*)\s*=>\s*[^)]*is_active",
    r"c\.is_active\s*&&",
    r"!\s*c\.is_active",
    r"is_active\s*&&\s*!.*is_deleted",
    r"filterActiveClasses|activeClassesOnly|onlyActive",
]

# Known correct alternate API
SAFE_CLASS_SOURCE = [
    r"getTeacherClasses\s*\(",
    r"homeworkService\.getTeacherClasses",
]


def _norm_web_rel(path: Path) -> str:
    try:
        return str(path.relative_to(web_src)).replace("\\", "/")
    except ValueError:
        return rel(path).replace("\\", "/")


def check_frontend_consumers(report: Report) -> None:
    if not web_src.exists():
        report.add("HIGH", "frontend", str(web_src), "web/src not found")
        return

    # When API defaults to active_only=True, raw getAll() consumers are safe for dropdowns.
    school_class_svc = fastapi_app / "services" / "school_class_service.py"
    svc_text = read_text(school_class_svc)
    api_defaults_active = bool(
        re.search(
            r"def get_all_classes\([\s\S]{0,400}active_only:\s*bool\s*=\s*True",
            svc_text,
        )
    )
    if api_defaults_active:
        report.add(
            "OK",
            "frontend",
            "api-default",
            "get_all_classes(active_only=True) by default — dropdown callers that omit the "
            "param will not receive inactive classes/divisions.",
        )

    suspects: list[Path] = []
    for path in web_src.rglob("*"):
        if path.suffix not in {".ts", ".tsx"}:
            continue
        if "node_modules" in path.parts:
            continue
        text = read_text(path)
        if any(re.search(p, text) for p in LOAD_PATTERNS):
            suspects.append(path)

    for path in sorted(suspects):
        nrel = _norm_web_rel(path)
        if any(nrel.endswith(a) or a in nrel for a in FRONTEND_ALLOWLIST):
            report.add(
                "OK",
                "frontend",
                nrel,
                "Allowlisted: class admin may show inactive classes intentionally",
            )
            continue

        text = read_text(path)

        # Safe if only uses teacher-classes homework API and no raw getAll
        uses_safe = any(re.search(p, text) for p in SAFE_CLASS_SOURCE)
        uses_raw = any(re.search(p, text) for p in LOAD_PATTERNS[:3])  # service calls
        if uses_safe and not uses_raw:
            report.add(
                "OK",
                "frontend",
                nrel,
                "Uses homework getTeacherClasses (backend active-only)",
            )
            continue

        filters_active = any(re.search(p, text) for p in FILTER_ACTIVE_PATTERNS)

        # Heuristic: file builds Select options from classes
        builds_options = bool(
            re.search(
                r"(setClassOptions|classOptions|classes\.map|map\s*\(\s*\(?\s*c)",
                text,
            )
        )

        if filters_active:
            report.add(
                "OK",
                "frontend",
                nrel,
                "Filters is_active when building class options",
            )
        elif api_defaults_active and (builds_options or uses_raw):
            report.add(
                "OK",
                "frontend",
                nrel,
                "Uses class list API; backend active_only=True default hides inactive "
                f"(impact was {_impact_for_path(nrel)})",
            )
        elif builds_options or uses_raw:
            impact = _impact_for_path(nrel)
            sev = "HIGH" if impact in {"students", "fees", "subjects", "enrollment", "transfer"} else "MED"
            report.add(
                sev,
                "frontend",
                nrel,
                f"Loads classes for UI but does NOT filter is_active "
                f"(impact: {impact}). Inactive classes can appear in filters/dropdowns.",
            )
        else:
            report.add(
                "LOW",
                "frontend",
                nrel,
                "References class list API; could not confirm Select mapping - review manually",
            )


def _impact_for_path(nrel: str) -> str:
    lower = nrel.lower()
    if "student" in lower or "enrollment" in lower or "admission" in lower:
        return "students" if "enrollment" not in lower and "admission" not in lower else "enrollment"
    if "fee" in lower or "invoice" in lower or "discount" in lower:
        return "fees"
    if "subject" in lower:
        return "subjects"
    if "transfer" in lower:
        return "transfer"
    if "teacher" in lower:
        return "teachers"
    if "attendance" in lower:
        return "attendance"
    if "notice" in lower or "holiday" in lower or "activity" in lower:
        return "comms"
    if "homework" in lower:
        return "homework"
    return "other"


# ── Optional DB check ────────────────────────────────────────────────────────

def check_db(report: Report) -> None:
    try:
        from dotenv import load_dotenv

        load_dotenv(os.getenv("ENV_FILE", str(fastapi_root / ".env")))
        if str(fastapi_root) not in sys.path:
            sys.path.insert(0, str(fastapi_root))
        from sqlalchemy import text
        from app.core.database import SessionLocal
    except Exception as exc:  # noqa: BLE001
        report.add("INFO", "db", "SessionLocal", f"DB check skipped: {exc}")
        return

    db = SessionLocal()
    try:
        rows = db.execute(
            text(
                """
                SELECT
                    SUM(CASE WHEN is_active = 1 AND is_deleted = 0 THEN 1 ELSE 0 END) AS active_cnt,
                    SUM(CASE WHEN is_active = 0 AND is_deleted = 0 THEN 1 ELSE 0 END) AS inactive_cnt,
                    SUM(CASE WHEN is_deleted = 1 THEN 1 ELSE 0 END) AS deleted_cnt
                FROM classes
                """
            )
        ).mappings().first()
        if not rows:
            report.add("INFO", "db", "classes", "No aggregate row returned")
            return

        active = int(rows["active_cnt"] or 0)
        inactive = int(rows["inactive_cnt"] or 0)
        deleted = int(rows["deleted_cnt"] or 0)
        report.add(
            "INFO",
            "db",
            "classes",
            f"Counts — active={active}, inactive={inactive}, deleted={deleted}",
        )
        if inactive == 0:
            report.add(
                "INFO",
                "db",
                "classes",
                "No inactive classes in DB; mark one inactive in UI then re-run to verify leakage.",
            )
        else:
            sample = db.execute(
                text(
                    """
                    SELECT TOP 10 id, name, is_active, academic_year_id
                    FROM classes
                    WHERE is_active = 0 AND is_deleted = 0
                    ORDER BY id
                    """
                )
            ).mappings().all()
            names = ", ".join(f"{r['id']}:{r['name']}" for r in sample)
            report.add(
                "INFO",
                "db",
                "classes",
                f"Inactive sample (should NOT appear in student/fee/subject dropdowns): {names}",
            )
    except Exception as exc:  # noqa: BLE001
        report.add("INFO", "db", "classes", f"Query failed: {exc}")
    finally:
        db.close()


# ── Verdict ──────────────────────────────────────────────────────────────────

def print_report(report: Report) -> None:
    print("=" * 72)
    print("INACTIVE CLASS ENFORCEMENT AUDIT")
    print("=" * 72)
    print()
    print("Expected behaviour:")
    print("  - Classes admin page: SHOW inactive (so you can reactivate)")
    print("  - Filters / create / edit / transfer dropdowns: HIDE inactive")
    print("  - API writes with inactive class_id: REJECT (400)")
    print()

    by_area: dict[str, list[Finding]] = {}
    for f in sorted(report.findings, key=lambda x: (SEVERITY_ORDER.get(x.severity, 9), x.area, x.path)):
        by_area.setdefault(f.area, []).append(f)

    for area, items in by_area.items():
        print(f"-- {area} ({len(items)}) " + "-" * max(0, 60 - len(area)))
        for f in items:
            print(f"  [{f.severity:4}] {f.path}")
            print(f"         {f.detail}")
        print()

    high = report.high_count
    med = report.med_count
    print("=" * 72)
    print("VERDICT")
    print("=" * 72)
    if high > 0:
        print(
            f"MAJOR bug (product defect), not a one-line UI typo.\n"
            f"  HIGH findings: {high}  |  MED findings: {med}\n"
            f"\n"
            f"Root cause pattern:\n"
            f"  1. Backend list APIs return all non-deleted classes (ignore is_active).\n"
            f"  2. Most frontend dropdowns map that list as-is.\n"
            f"  3. Write APIs do not reject inactive class_id.\n"
            f"\n"
            f"Severity note:\n"
            f"  - Not a security/crash 'critical' infrastructure failure.\n"
            f"  - IS a major functional / data-integrity bug: inactive classes remain\n"
            f"    assignable system-wide (students, fees, subjects, etc.).\n"
            f"\n"
            f"Suggested fix (smallest lasting fix):\n"
            f"  A. Add active_only=True (default for dropdowns) to get_all_classes + /api/classes.\n"
            f"  B. Keep Class list page calling with active_only=False.\n"
            f"  C. Reject inactive class_id in student/fee/subject write services.\n"
            f"  D. Optionally also filter division.is_active the same way."
        )
    elif med > 0:
        print(f"Partial - no HIGH, but {med} MED gaps remain. Review MED items.")
    else:
        print("PASS - no HIGH/MED inactive-class enforcement gaps found.")
    print("=" * 72)


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit inactive class enforcement")
    parser.add_argument(
        "--with-db",
        action="store_true",
        help="Also query SSMS class active/inactive counts",
    )
    args = parser.parse_args()

    report = Report()
    check_backend_list_apis(report)
    check_backend_write_guards(report)
    check_frontend_consumers(report)
    if args.with_db:
        check_db(report)

    print_report(report)
    return 1 if report.high_count else 0


if __name__ == "__main__":
    raise SystemExit(main())
