"""
Pre-push readiness check: Homework + Notice unread counts.

Verifies:
  1) Code wiring (sidebar hooks, unread APIs, filter params)
  2) Role-wise counts (admin / teacher / student)
  3) Filter narrowing (HW class/year; Notice audience/type)
  4) Admin count >= teacher/student scoped counts (sanity)

Usage (from apps/fastapi):
    python scripts/check_hw_notice_counts_ready.py
    python scripts/check_hw_notice_counts_ready.py --tenant-id 20
    python scripts/check_hw_notice_counts_ready.py --tenant-id 20 --admin "Shant" --teacher "Gayatri"

Exit 0 = READY TO PUSH; 1 = gaps / failures.
"""
from __future__ import annotations

import argparse
import os
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from dotenv import load_dotenv

load_dotenv(os.getenv("ENV_FILE", ".env"))

from sqlalchemy import text

from app.core.database import SessionLocal
from app.repositories import homework_repository as hw_repo
from app.services import notice_service
from app.services.homework_access import resolve_homework_viewer_context
from app.services.homework_service import (
    count_unread_homework,
    resolve_current_academic_year_id,
)
from app.services.notice_access import resolve_teacher_notice_target_pairs


@dataclass
class Report:
    ok: list[str] = field(default_factory=list)
    fail: list[str] = field(default_factory=list)
    info: list[str] = field(default_factory=list)


def _print(msg: str = "") -> None:
    print(msg.encode("ascii", "replace").decode("ascii"))


def _web_root() -> Path:
    return Path(parent_dir).parent / "web"


def _file_has(rel_from_fastapi: str, needle: str) -> bool:
    """rel_from_fastapi: e.g. app/services/x.py or ../web/src/hooks/y.ts"""
    candidates = [
        Path(parent_dir) / rel_from_fastapi,
        _web_root() / rel_from_fastapi.replace("../web/", ""),
    ]
    if rel_from_fastapi.startswith("../web/"):
        candidates.append(_web_root() / rel_from_fastapi[len("../web/") :])
    for p in candidates:
        if p.exists():
            try:
                return needle in p.read_text(encoding="utf-8", errors="ignore")
            except OSError:
                return False
    return False


def check_wiring(report: Report) -> None:
    _print("\n=== 1) CODE WIRING ===")
    checks = [
        ("HW unread API", "app/routers/homework_router.py", "unread-count"),
        ("HW current-year default", "app/services/homework_service.py", "resolve_current_academic_year_id"),
        ("HW sidebar userId", "../web/src/hooks/useHomeworkSidebarCount.ts", "userId"),
        ("Notice unread API", "app/routers/notice.py", "unread-count"),
        ("Notice filter params API", "app/routers/notice.py", "audience_type"),
        ("Notice sidebar userId", "../web/src/hooks/useNoticeSidebarCount.ts", "userId"),
        ("Notice list pushes filters", "../web/src/hooks/useNoticeListController.ts", "notifyNoticeCountChanged"),
        ("Notice filter event type", "../web/src/utils/noticeCountEvents.ts", "NoticeUnreadFilters"),
        ("Notice service getUnreadCount params", "../web/src/api/services/noticeService.ts", "audience_type"),
        ("Notice repo filter count", "app/repositories/notice_repository.py", "notice_type"),
        ("Admin-first notice context", "app/services/notice_service.py", "Admins always see tenant-wide"),
    ]
    for label, path, needle in checks:
        if _file_has(path, needle):
            report.ok.append(label)
            _print(f"  OK   {label}")
        else:
            report.fail.append(f"{label}: missing '{needle}' in {path}")
            _print(f"  FAIL {label}")


def _find_user(db, *, tenant_id: int, name_like: str) -> Optional[dict[str, Any]]:
    row = db.execute(
        text(
            """
            SELECT TOP 1
                u.id AS user_id,
                u.full_name,
                u.email,
                u.role,
                t.id AS teacher_id,
                t.full_name AS teacher_name
            FROM dbo.users u
            LEFT JOIN dbo.teachers t
                ON t.user_id = u.id AND t.tenant_id = u.tenant_id AND t.is_deleted = 0
            WHERE u.tenant_id = :tenant_id
              AND u.is_active = 1
              AND (u.full_name LIKE :name OR t.full_name LIKE :name)
            ORDER BY CASE WHEN t.id IS NOT NULL THEN 0 ELSE 1 END, u.id
            """
        ),
        {"tenant_id": tenant_id, "name": f"%{name_like}%"},
    ).mappings().first()
    return dict(row) if row else None


def _find_student(db, *, tenant_id: int) -> Optional[dict[str, Any]]:
    row = db.execute(
        text(
            """
            SELECT TOP 1
                u.id AS user_id,
                u.full_name,
                u.email,
                u.role,
                CAST(NULL AS INT) AS teacher_id,
                CAST(NULL AS NVARCHAR(200)) AS teacher_name
            FROM dbo.users u
            WHERE u.tenant_id = :tenant_id
              AND u.is_active = 1
              AND (
                    LOWER(CAST(u.role AS NVARCHAR(50))) LIKE '%student%'
                 OR LOWER(u.email) LIKE '%@student.%'
              )
            ORDER BY u.id
            """
        ),
        {"tenant_id": tenant_id},
    ).mappings().first()
    return dict(row) if row else None


def _hw_ctx(db, *, tenant_id: int, user: dict[str, Any]):
    teacher_id = int(user["teacher_id"]) if user.get("teacher_id") is not None else None
    return resolve_homework_viewer_context(
        db,
        tenant_id=tenant_id,
        user_id=int(user["user_id"]),
        email=str(user.get("email") or ""),
        legacy_role=user["role"],
        teacher_id=teacher_id,
    )


def _hw_unread(
    db,
    *,
    tenant_id: int,
    user: dict[str, Any],
    year_id: Optional[int],
    class_id: Optional[int] = None,
    class_division_id: Optional[int] = None,
    subject_id: Optional[int] = None,
) -> int:
    ctx = _hw_ctx(db, tenant_id=tenant_id, user=user)
    # Service path defaults year when None — call repo with explicit year for filter tests.
    return hw_repo.count_unread_homework(
        db,
        tenant_id=tenant_id,
        user_id=int(user["user_id"]),
        viewer_context=ctx,
        academic_year_id=year_id,
        class_id=class_id,
        class_division_id=class_division_id,
        subject_id=subject_id,
    )


def _notice_unread(
    db,
    *,
    tenant_id: int,
    user: dict[str, Any],
    audience_type: Optional[str] = None,
    notice_type: Optional[str] = None,
) -> tuple[int, Any]:
    ctx = notice_service.get_viewer_context(
        db,
        tenant_id=tenant_id,
        user_id=int(user["user_id"]),
        email=str(user.get("email") or ""),
        legacy_role=user["role"],
        manage=False,
    )
    count = notice_service.count_unread_notices(
        db,
        tenant_id=tenant_id,
        user_id=int(user["user_id"]),
        viewer_context=ctx,
        audience_type=audience_type,
        notice_type=notice_type,
    )
    return count, ctx


def check_role_counts(
    db,
    report: Report,
    *,
    tenant_id: int,
    admin: dict[str, Any],
    teacher: dict[str, Any],
    student: Optional[dict[str, Any]],
    year_id: Optional[int],
) -> dict[str, int]:
    _print("\n=== 2) ROLE-WISE COUNTS (user switch / login badge) ===")
    counts: dict[str, int] = {}

    # Homework via service (defaults current year)
    for key, user in (("admin", admin), ("teacher", teacher)):
        ctx = _hw_ctx(db, tenant_id=tenant_id, user=user)
        n = count_unread_homework(
            db,
            tenant_id=tenant_id,
            user_id=int(user["user_id"]),
            viewer_context=ctx,
            academic_year_id=None,
        )
        counts[f"hw_{key}"] = n
        label = user.get("teacher_name") or user.get("full_name")
        _print(f"  HW  {key:8} {label}: unread={n}  kind={ctx.kind}")
        report.info.append(f"hw_{key}={n} kind={ctx.kind}")

    if student:
        ctx = _hw_ctx(db, tenant_id=tenant_id, user=student)
        n = count_unread_homework(
            db,
            tenant_id=tenant_id,
            user_id=int(student["user_id"]),
            viewer_context=ctx,
            academic_year_id=None,
        )
        counts["hw_student"] = n
        _print(f"  HW  student  {student.get('full_name')}: unread={n}  kind={ctx.kind}")
        if ctx.kind != "student" and ctx.kind != "parent":
            report.fail.append(f"Student user resolved as kind={ctx.kind}, expected student/parent")
            _print(f"  FAIL student kind={ctx.kind}")
        else:
            report.ok.append("HW student kind")
            _print("  OK   HW student kind")

    # Notice
    for key, user in (("admin", admin), ("teacher", teacher)):
        n, ctx = _notice_unread(db, tenant_id=tenant_id, user=user)
        counts[f"notice_{key}"] = n
        label = user.get("teacher_name") or user.get("full_name")
        _print(f"  NTC {key:8} {label}: unread={n}  kind={ctx.kind}")
        report.info.append(f"notice_{key}={n} kind={ctx.kind}")

    if student:
        n, ctx = _notice_unread(db, tenant_id=tenant_id, user=student)
        counts["notice_student"] = n
        _print(f"  NTC student  {student.get('full_name')}: unread={n}  kind={ctx.kind}")

    # Admin HW should be admin kind
    admin_hw_ctx = _hw_ctx(db, tenant_id=tenant_id, user=admin)
    if admin_hw_ctx.kind != "admin":
        report.fail.append(f"Admin HW kind={admin_hw_ctx.kind}, expected admin")
        _print(f"  FAIL admin HW kind={admin_hw_ctx.kind}")
    else:
        report.ok.append("HW admin kind")
        _print("  OK   HW admin kind")

    notice_admin_kind = notice_service.get_viewer_context(
        db,
        tenant_id=tenant_id,
        user_id=int(admin["user_id"]),
        email=str(admin.get("email") or ""),
        legacy_role=admin["role"],
        manage=False,
    ).kind
    if notice_admin_kind != "admin":
        report.fail.append(f"Admin notice kind={notice_admin_kind}, expected admin")
        _print(f"  FAIL admin notice kind={notice_admin_kind}")
    else:
        report.ok.append("Notice admin kind")
        _print("  OK   Notice admin kind")

    teacher_hw_ctx = _hw_ctx(db, tenant_id=tenant_id, user=teacher)
    if teacher_hw_ctx.kind != "teacher":
        report.fail.append(f"Teacher HW kind={teacher_hw_ctx.kind}")
        _print(f"  FAIL teacher HW kind={teacher_hw_ctx.kind}")
    else:
        report.ok.append("HW teacher kind")
        _print("  OK   HW teacher kind")

    # Sanity: admin HW >= teacher HW (same year, broader scope)
    if counts.get("hw_admin", 0) < counts.get("hw_teacher", 0):
        report.fail.append(
            f"HW admin unread ({counts['hw_admin']}) < teacher ({counts['hw_teacher']})"
        )
        _print("  FAIL HW admin < teacher (unexpected)")
    else:
        report.ok.append("HW admin >= teacher")
        _print("  OK   HW admin >= teacher")

    if counts.get("notice_admin", 0) < counts.get("notice_teacher", 0):
        report.fail.append(
            f"Notice admin unread ({counts['notice_admin']}) < teacher ({counts['notice_teacher']})"
        )
        _print("  FAIL Notice admin < teacher (unexpected)")
    else:
        report.ok.append("Notice admin >= teacher")
        _print("  OK   Notice admin >= teacher")

    # User-wise distinct: teacher should not equal admin if both have data and scopes differ
    if (
        counts.get("hw_admin", 0) > 0
        and counts.get("hw_teacher", 0) >= 0
        and counts["hw_admin"] == counts["hw_teacher"]
        and teacher_hw_ctx.scopes
    ):
        report.info.append(
            "HW admin==teacher count (possible if teacher scope covers all live HW)"
        )
        _print("  INFO HW admin count equals teacher (scopes may cover all HW)")

    if year_id:
        report.ok.append(f"current academic_year_id={year_id}")
        _print(f"  OK   current academic_year_id={year_id}")
    else:
        report.fail.append("No current/active academic year for tenant")
        _print("  FAIL no academic year")

    return counts


def check_hw_filters(
    db,
    report: Report,
    *,
    tenant_id: int,
    teacher: dict[str, Any],
    year_id: Optional[int],
) -> None:
    _print("\n=== 3) HOMEWORK FILTER NARROWING ===")
    ctx = _hw_ctx(db, tenant_id=tenant_id, user=teacher)
    base = _hw_unread(db, tenant_id=tenant_id, user=teacher, year_id=year_id)
    _print(f"  Teacher base unread (year={year_id}): {base}")

    if not ctx.scopes:
        report.info.append("Teacher has no HW scopes; skip class filter test")
        _print("  INFO no teacher HW scopes — skip")
        return

    scope = ctx.scopes[0]
    class_id = scope.class_id
    div_id = scope.class_division_id
    filtered = _hw_unread(
        db,
        tenant_id=tenant_id,
        user=teacher,
        year_id=year_id,
        class_id=class_id,
        class_division_id=div_id,
    )
    _print(f"  Filtered class={class_id} div={div_id}: {filtered}")

    if filtered > base:
        report.fail.append(f"HW class filter raised count {base} -> {filtered}")
        _print("  FAIL filter increased count")
    else:
        report.ok.append("HW class/div filter <= base")
        _print("  OK   class/div filter <= base")

    # Impossible subject should yield 0
    zero = _hw_unread(
        db,
        tenant_id=tenant_id,
        user=teacher,
        year_id=year_id,
        class_id=class_id,
        subject_id=-1,
    )
    if zero != 0:
        report.fail.append(f"HW subject_id=-1 unread={zero}, expected 0")
        _print(f"  FAIL subject_id=-1 => {zero}")
    else:
        report.ok.append("HW invalid subject filter => 0")
        _print("  OK   invalid subject filter => 0")


def check_notice_filters(
    db,
    report: Report,
    *,
    tenant_id: int,
    admin: dict[str, Any],
    teacher: dict[str, Any],
) -> None:
    _print("\n=== 4) NOTICE FILTER NARROWING ===")
    base_admin, _ = _notice_unread(db, tenant_id=tenant_id, user=admin)
    base_teacher, tctx = _notice_unread(db, tenant_id=tenant_id, user=teacher)
    _print(f"  Admin base: {base_admin} | Teacher base: {base_teacher}")

    for audience in ("TEACHER", "STUDENT"):
        n_admin, _ = _notice_unread(
            db, tenant_id=tenant_id, user=admin, audience_type=audience
        )
        n_teacher, _ = _notice_unread(
            db, tenant_id=tenant_id, user=teacher, audience_type=audience
        )
        _print(f"  audience={audience}: admin={n_admin} teacher={n_teacher}")
        if n_admin > base_admin:
            report.fail.append(f"Notice audience={audience} raised admin {base_admin}->{n_admin}")
            _print(f"  FAIL admin audience filter raised count")
        else:
            report.ok.append(f"Notice admin audience={audience} <= base")
            _print(f"  OK   admin audience={audience} <= base")

        if n_teacher > base_teacher:
            report.fail.append(
                f"Notice audience={audience} raised teacher {base_teacher}->{n_teacher}"
            )
            _print("  FAIL teacher audience filter raised count")
        else:
            report.ok.append(f"Notice teacher audience={audience} <= base")
            _print(f"  OK   teacher audience={audience} <= base")

    # Sum of TEACHER+STUDENT for teacher should be <= base (teacher has no ALL)
    t_only, _ = _notice_unread(
        db, tenant_id=tenant_id, user=teacher, audience_type="TEACHER"
    )
    s_only, _ = _notice_unread(
        db, tenant_id=tenant_id, user=teacher, audience_type="STUDENT"
    )
    if t_only + s_only > base_teacher + 0:
        # Equality expected if teacher only sees TEACHER+STUDENT
        pass
    if t_only + s_only != base_teacher:
        report.info.append(
            f"Teacher TEACHER({t_only})+STUDENT({s_only})={t_only + s_only} "
            f"vs base={base_teacher} (OK if no overlap; should usually match)"
        )
        _print(
            f"  INFO teacher TEACHER+STUDENT={t_only + s_only} base={base_teacher}"
        )
        if t_only + s_only == base_teacher:
            report.ok.append("Teacher TEACHER+STUDENT == base")
            _print("  OK   TEACHER+STUDENT parts sum to base")
        elif t_only + s_only < base_teacher:
            report.fail.append("Teacher filter parts sum < base (missing audience?)")
            _print("  FAIL parts sum < base")
        else:
            report.fail.append("Teacher filter parts sum > base (overlap bug?)")
            _print("  FAIL parts sum > base")
    else:
        report.ok.append("Teacher TEACHER+STUDENT == base")
        _print("  OK   TEACHER+STUDENT parts sum to base")

    # Notice type filter
    for ntype in ("GENERAL", "FEE", "EVENT", "HOLIDAY", "EXAM"):
        n, _ = _notice_unread(
            db, tenant_id=tenant_id, user=admin, notice_type=ntype
        )
        if n > base_admin:
            report.fail.append(f"notice_type={ntype} raised admin count")
            _print(f"  FAIL type={ntype} raised count")
            break
    else:
        report.ok.append("Notice type filters <= base")
        _print("  OK   all notice_type filters <= base")

    # Impossible type
    zero, _ = _notice_unread(
        db, tenant_id=tenant_id, user=admin, notice_type="NOT_A_REAL_TYPE"
    )
    if zero != 0:
        report.fail.append(f"bogus notice_type unread={zero}")
        _print(f"  FAIL bogus type => {zero}")
    else:
        report.ok.append("Bogus notice_type => 0")
        _print("  OK   bogus notice_type => 0")

    pairs = resolve_teacher_notice_target_pairs(
        db, tenant_id=tenant_id, user_id=int(teacher["user_id"])
    )
    if pairs:
        report.ok.append(f"Teacher class-teacher pairs={sorted(pairs)}")
        _print(f"  OK   class-teacher pairs={sorted(pairs)}")
    else:
        report.info.append("Teacher has no class-teacher pairs (STUDENT notices hidden)")
        _print("  INFO no class-teacher pairs")
    _ = tctx


def main() -> int:
    p = argparse.ArgumentParser(description="HW + Notice count readiness check")
    p.add_argument("--tenant-id", type=int, default=20)
    p.add_argument("--admin", type=str, default="Shant")
    p.add_argument("--teacher", type=str, default="Gayatri")
    args = p.parse_args()

    report = Report()
    _print("=" * 72)
    _print(f"HW + NOTICE COUNT READINESS  tenant={args.tenant_id}")
    _print("=" * 72)

    check_wiring(report)

    db = SessionLocal()
    try:
        year_id = resolve_current_academic_year_id(db, args.tenant_id)
        admin = _find_user(db, tenant_id=args.tenant_id, name_like=args.admin)
        teacher = _find_user(db, tenant_id=args.tenant_id, name_like=args.teacher)
        student = _find_student(db, tenant_id=args.tenant_id)

        if not admin:
            report.fail.append(f"Admin user not found: {args.admin!r}")
            _print(f"\nFAIL admin not found: {args.admin}")
        if not teacher:
            report.fail.append(f"Teacher user not found: {args.teacher!r}")
            _print(f"FAIL teacher not found: {args.teacher}")

        if admin and teacher:
            check_role_counts(
                db,
                report,
                tenant_id=args.tenant_id,
                admin=admin,
                teacher=teacher,
                student=student,
                year_id=year_id,
            )
            check_hw_filters(
                db,
                report,
                tenant_id=args.tenant_id,
                teacher=teacher,
                year_id=year_id,
            )
            check_notice_filters(
                db,
                report,
                tenant_id=args.tenant_id,
                admin=admin,
                teacher=teacher,
            )
    except Exception as exc:
        report.fail.append(str(exc))
        _print(f"\nERROR {exc}")
    finally:
        db.close()

    _print("\n" + "=" * 72)
    _print(f"SUMMARY  ok={len(report.ok)}  fail={len(report.fail)}  info={len(report.info)}")
    for f in report.fail:
        _print(f"  FAIL {f}")
    if report.fail:
        _print("\nNOT READY — fix failures before push.")
        return 1

    _print("\nREADY TO PUSH — HW + Notice counts look correct.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
