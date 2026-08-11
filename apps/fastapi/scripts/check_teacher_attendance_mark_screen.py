"""
Diagnose Teacher Attendance → Mark Attendance screen.

Screen: /attendance/teacher-marking (tab "Mark Attendance")
Symptom: Teacher Name dropdown does not show real school teachers.

Root cause (confirmed by this script when it fails):
  Frontend uses hardcoded MOCK_TEACHERS (Priya Sharma, Rahul Mehta, Anita Desai).
  No API call loads teachers. No staff/teacher attendance mark API exists.
  Backend /attendance/* is student attendance only.
  Real teachers live at GET /api/teachers/ but this screen never calls it.

Checks:
  1. Static — mock teachers + no API wiring in controller/tab
  2. Live API — staff-attendance endpoints missing; real teachers list works
  3. Compare — mock names vs DB teachers from API

Usage (from apps/fastapi, with backend on :8022):
    python scripts/check_teacher_attendance_mark_screen.py
    python scripts/check_teacher_attendance_mark_screen.py --base-url http://127.0.0.1:8022
    python scripts/check_teacher_attendance_mark_screen.py --email you@school.com --password secret

Exit 0 = screen correctly wired to real data (not expected today).
Exit 1 = bugs found (current expected state until feature is implemented).
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

current_dir = os.path.dirname(os.path.abspath(__file__))
fastapi_root = Path(os.path.dirname(current_dir))
repo_apps = fastapi_root.parent
web_src = repo_apps / "web" / "src"

MOCK_FILE = (
    web_src
    / "pages"
    / "Attendance"
    / "teacher-marking"
    / "teacherAttendanceMarking.mock.ts"
)
CONTROLLER = web_src / "hooks" / "useTeacherAttendanceMarkingController.ts"
MARK_TAB = (
    web_src
    / "pages"
    / "Attendance"
    / "teacher-marking"
    / "components"
    / "TeacherMarkAttendanceTab.tsx"
)
ATTENDANCE_ROUTER = fastapi_root / "app" / "routers" / "attendance_router.py"
TEACHER_ROUTER = fastapi_root / "app" / "routers" / "teacher_router.py"

KNOWN_MOCK_NAMES = ("Priya Sharma", "Rahul Mehta", "Anita Desai")

# Endpoints that a real Staff Attendance feature would need (none exist today).
STAFF_ATTENDANCE_PROBES = (
    "/api/staff-attendance",
    "/api/teacher-attendance",
    "/attendance/teachers",
    "/attendance/staff",
    "/attendance/teacher-marking",
    "/api/attendance/staff",
    "/api/attendance/teachers",
)


def _print(msg: str = "") -> None:
    print(msg.encode("ascii", "replace").decode("ascii"))


def _read(path: Path) -> str:
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8", errors="ignore")


def check_static() -> list[str]:
    failures: list[str] = []
    _print("=" * 64)
    _print("1) STATIC CHECK — frontend Teacher Attendance Mark screen")
    _print("=" * 64)

    mock_text = _read(MOCK_FILE)
    ctrl_text = _read(CONTROLLER)
    tab_text = _read(MARK_TAB)
    att_router = _read(ATTENDANCE_ROUTER)
    teach_router = _read(TEACHER_ROUTER)

    if not mock_text:
        failures.append(f"MISSING mock file: {MOCK_FILE}")
        return failures
    if not ctrl_text:
        failures.append(f"MISSING controller: {CONTROLLER}")
        return failures
    if not tab_text:
        failures.append(f"MISSING mark tab: {MARK_TAB}")
        return failures

    _print(f"  mock:       {MOCK_FILE.relative_to(repo_apps)}")
    _print(f"  controller: {CONTROLLER.relative_to(repo_apps)}")
    _print(f"  mark tab:   {MARK_TAB.relative_to(repo_apps)}")

    # --- Mock teachers present ---
    if "MOCK_TEACHERS" not in mock_text:
        _print("  OK  MOCK_TEACHERS not found (screen may be wired to API)")
    else:
        failures.append(
            "BUG: Teacher dropdown source is MOCK_TEACHERS "
            f"in {MOCK_FILE.name} — not loaded from API/DB."
        )
        _print("  FAIL MOCK_TEACHERS is the teacher dropdown source")

    for name in KNOWN_MOCK_NAMES:
        if name in mock_text:
            _print(f"  FAIL hardcoded mock teacher: {name}")
            failures.append(f"BUG: Hardcoded mock teacher name '{name}' in UI mock data.")
        else:
            _print(f"  OK  mock name absent: {name}")

    # --- Controller must not depend on mocks ---
    if "MOCK_TEACHERS" in ctrl_text or "getActiveTeachers" in ctrl_text or "getMarkableTeachers" in ctrl_text:
        failures.append(
            "BUG: useTeacherAttendanceMarkingController uses mock teacher helpers "
            "(getActiveTeachers / getMarkableTeachers / MOCK_*), not teacherService.list()."
        )
        _print("  FAIL controller uses mock teacher helpers")
    else:
        _print("  OK  controller does not use mock teacher helpers")

    api_hints = (
        "teacherService",
        "attendanceService",
        "api/teachers",
        "/api/teachers",
        "fetch(",
        "axios",
        "useQuery",
    )
    if any(h in ctrl_text for h in api_hints):
        _print("  OK  controller references an API client")
    else:
        failures.append(
            "BUG: Controller never calls teacher/attendance API — "
            "Mark Attendance cannot show real teachers or persist attendance."
        )
        _print("  FAIL controller has no API client call for teachers/attendance")

    if "markableTeachers.map" in tab_text or "markableTeachers" in tab_text:
        _print("  INFO Mark tab renders markableTeachers from controller")
    else:
        failures.append("BUG: Mark Attendance tab does not render markableTeachers list.")

    # Saves must not be local-only setState forever if API exists — today they are.
    if re.search(r"setRecords\(", ctrl_text) and not any(
        h in ctrl_text for h in ("teacherService", "attendanceService", "fetch(", "axios")
    ):
        failures.append(
            "BUG: Save/check-in only updates local React state (setRecords) — "
            "data is lost on refresh; nothing is written to SQL Server."
        )
        _print("  FAIL save path is in-memory only (setRecords)")

    # --- Backend: no staff attendance router ---
    staff_markers = (
        "staff_attendance",
        "teacher_attendance_mark",
        "StaffAttendance",
        "TeacherAttendanceRecord",
        "/staff-attendance",
        "mark_staff",
    )
    if any(m in att_router for m in staff_markers):
        _print("  OK  attendance_router mentions staff/teacher mark APIs")
    else:
        failures.append(
            "BUG: Backend attendance_router.py has no staff/teacher Mark Attendance API "
            "(only student attendance)."
        )
        _print("  FAIL no staff/teacher mark endpoints in attendance_router.py")

    if 'prefix="/teachers"' in teach_router or 'prefix="/teachers"' in teach_router.replace("'", '"'):
        _print("  INFO real teachers API exists at /api/teachers/ (unused by this screen)")
    if "attendance-scope" in teach_router:
        _print(
            "  INFO /api/teachers/me/attendance-scope is for STUDENT class scope, "
            "not staff attendance marking"
        )

    return failures


def _http_json(
    method: str,
    url: str,
    *,
    token: str | None = None,
    body: dict | None = None,
    timeout: float = 15.0,
) -> tuple[int, object]:
    data = None
    headers = {"Accept": "application/json"}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"

    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            payload: object
            try:
                payload = json.loads(raw) if raw else {}
            except json.JSONDecodeError:
                payload = raw
            return resp.status, payload
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            payload = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            payload = raw
        return exc.code, payload
    except urllib.error.URLError as exc:
        return 0, {"error": str(exc.reason)}


def login(base_url: str, email: str, password: str) -> str | None:
    base = base_url.rstrip("/")
    for path in ("/auth/login", "/auth/login/context", "/login", "/api/auth/login"):
        status, payload = _http_json(
            "POST",
            f"{base}{path}",
            body={"email": email, "password": password},
        )
        if status == 200 and isinstance(payload, dict) and payload.get("access_token"):
            return str(payload["access_token"])
        last = (status, payload)
    _print(f"  FAIL login HTTP {last[0]}: {last[1]}")
    return None


def check_live_api(base_url: str, email: str | None, password: str | None) -> list[str]:
    failures: list[str] = []
    _print()
    _print("=" * 64)
    _print(f"2) LIVE API CHECK — backend on {base_url}")
    _print("=" * 64)

    # Health
    status, payload = _http_json("GET", f"{base_url.rstrip('/')}/health")
    if status == 0:
        failures.append(
            f"BUG: Backend not reachable at {base_url} ({payload}). "
            "Start uvicorn on port 8022 before re-running live checks."
        )
        _print(f"  FAIL backend unreachable: {payload}")
        return failures
    if status == 200:
        _print(f"  OK  /health -> {status}")
    else:
        _print(f"  WARN /health -> {status} (continuing)")

    token: str | None = None
    if email and password:
        _print(f"  INFO logging in as {email}")
        token = login(base_url, email, password)
        if not token:
            failures.append("BUG: Could not login — live teacher list check skipped.")
            return failures
        _print("  OK  login succeeded")
    else:
        _print(
            "  WARN no --email/--password — probing public/auth-required endpoints without token"
        )

    # Probe staff attendance endpoints — expect 404
    missing = 0
    for path in STAFF_ATTENDANCE_PROBES:
        url = f"{base_url.rstrip('/')}{path}"
        st, _ = _http_json("GET", url, token=token)
        if st in (404, 405):
            missing += 1
            _print(f"  FAIL {path} -> {st} (missing staff attendance API)")
        elif st in (401, 403):
            _print(f"  INFO {path} -> {st} (exists but auth blocked)")
        elif st == 0:
            _print(f"  FAIL {path} -> unreachable")
            missing += 1
        else:
            _print(f"  INFO {path} -> {st}")

    if missing == len(STAFF_ATTENDANCE_PROBES):
        failures.append(
            "BUG: No staff/teacher attendance API endpoints found. "
            "Mark Attendance screen has nothing to call on the backend."
        )
    elif missing:
        failures.append(
            f"BUG: {missing}/{len(STAFF_ATTENDANCE_PROBES)} expected staff attendance "
            "paths are missing (404)."
        )

    # Real teachers API
    teachers_url = f"{base_url.rstrip('/')}/api/teachers/?skip=0&limit=50"
    st, payload = _http_json("GET", teachers_url, token=token)
    if st in (401, 403) and not token:
        failures.append(
            "INFO: GET /api/teachers/ requires auth. Re-run with --email and --password "
            "to compare real DB teachers vs mock dropdown names."
        )
        _print(f"  FAIL {teachers_url} -> {st} (need login)")
        return failures

    if st != 200 or not isinstance(payload, dict):
        failures.append(f"BUG: GET /api/teachers/ failed HTTP {st}: {payload}")
        _print(f"  FAIL /api/teachers/ -> {st}")
        return failures

    items = payload.get("items") or payload.get("data") or []
    if not isinstance(items, list):
        failures.append(f"BUG: Unexpected teachers response shape: {payload}")
        return failures

    total = payload.get("total", len(items))
    _print(f"  OK  /api/teachers/ -> {st}  total={total}  page_items={len(items)}")

    real_names: list[str] = []
    for row in items:
        if not isinstance(row, dict):
            continue
        name = (
            row.get("full_name")
            or row.get("name")
            or " ".join(
                str(x) for x in (row.get("first_name"), row.get("last_name")) if x
            ).strip()
        )
        if name:
            real_names.append(str(name))

    if not real_names:
        failures.append(
            "BUG: /api/teachers/ returned zero teachers for this tenant — "
            "even after wiring, dropdown would be empty until teachers are created."
        )
        _print("  FAIL no active teachers returned from API")
    else:
        _print("  Real teachers from API (sample):")
        for name in real_names[:15]:
            _print(f"    - {name}")
        if len(real_names) > 15:
            _print(f"    ... +{len(real_names) - 15} more")

    # Compare mock vs real
    mock_in_real = [n for n in KNOWN_MOCK_NAMES if any(n.lower() == r.lower() for r in real_names)]
    mock_only = [n for n in KNOWN_MOCK_NAMES if n not in mock_in_real]
    if mock_only and real_names:
        failures.append(
            "BUG: Dropdown mock names do not match real DB teachers. "
            f"Mock-only: {mock_only}. Real sample: {real_names[:5]}"
        )
        _print("  FAIL mock dropdown names are NOT the school's real teachers")
        _print(f"       mock-only: {mock_only}")
    elif mock_in_real and len(mock_in_real) == len(KNOWN_MOCK_NAMES):
        _print(
            "  WARN mock names happen to exist in DB — screen still uses mocks, "
            "not this API list"
        )

    return failures


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Check Teacher Attendance Mark Attendance screen wiring/bugs"
    )
    parser.add_argument(
        "--base-url",
        default=os.environ.get("API_BASE_URL", "http://127.0.0.1:8022"),
        help="FastAPI base URL (default http://127.0.0.1:8022)",
    )
    parser.add_argument("--email", default=os.environ.get("CHECK_EMAIL"), help="Login email")
    parser.add_argument(
        "--password", default=os.environ.get("CHECK_PASSWORD"), help="Login password"
    )
    parser.add_argument(
        "--static-only",
        action="store_true",
        help="Skip live API probes",
    )
    args = parser.parse_args()

    _print("Teacher Attendance / Mark Attendance — diagnostic")
    _print(f"Repo apps: {repo_apps}")
    _print()

    failures = check_static()
    if not args.static_only:
        failures.extend(check_live_api(args.base_url, args.email, args.password))

    _print()
    _print("=" * 64)
    _print("RESULT")
    _print("=" * 64)
    if failures:
        # de-dupe while preserving order
        seen: set[str] = set()
        uniq: list[str] = []
        for f in failures:
            if f not in seen:
                seen.add(f)
                uniq.append(f)
        _print(f"FAILED — {len(uniq)} issue(s):")
        for i, f in enumerate(uniq, 1):
            _print(f"  {i}. {f}")
        _print()
        _print("Summary:")
        _print(
            "  The Teacher Name dropdown shows hardcoded mock teachers "
            "(Priya Sharma / Rahul Mehta / Anita Desai), not GET /api/teachers/."
        )
        _print(
            "  Staff attendance mark/save/calendar APIs do not exist yet — "
            "only student /attendance/* is implemented."
        )
        _print(
            "  Fix requires: load teachers from API + new staff attendance backend "
            "+ wire Mark Attendance save to that API."
        )
        return 1

    _print("PASSED — screen appears wired to real teacher/attendance APIs.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
