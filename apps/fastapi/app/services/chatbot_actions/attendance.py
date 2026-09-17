"""Chatbot actions: get_attendance and add_attendance."""

from __future__ import annotations

from calendar import monthrange
from datetime import date
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.schemas.attendance_schema import AttendanceRecord, MarkAttendanceRequest
from app.services.attendance_access import (
    assert_teacher_class_division_access,
    is_admin_like,
    is_teacher_like,
)
from app.services.attendance_service import ALLOWED_STUDENT_ATTENDANCE_STATUSES, AttendanceService
from app.services.chatbot_actions.errors import forbidden, from_exception, validation
from app.services.chatbot_actions.lookups import resolve_student_for_write
from app.services.chatbot_actions.scope import (
    as_date,
    optional_int,
    optional_str,
    require_staff_for_write,
    resolve_consumer_student,
)
from app.services import homework_service, teacher_service


def get_attendance(db: Session, current_user: Any, payload: dict[str, Any]) -> dict[str, Any]:
    try:
        return _get_attendance(db, current_user, payload or {})
    except Exception as exc:
        raise from_exception(exc) from exc


def _month_range(today: date) -> tuple[date, date]:
    last_day = monthrange(today.year, today.month)[1]
    return date(today.year, today.month, 1), date(today.year, today.month, last_day)


def _get_attendance(db: Session, current_user: Any, payload: dict[str, Any]) -> dict[str, Any]:
    today = date.today()
    from_date = as_date(payload.get("from_date"))
    to_date = as_date(payload.get("to_date"))
    if from_date is None or to_date is None:
        month_start, month_end = _month_range(today)
        from_date = from_date or month_start
        to_date = to_date or month_end
    if to_date < from_date:
        raise validation("to_date must be on or after from_date.")

    student_id = optional_int(payload.get("student_id"), field="student_id")
    class_id = optional_int(payload.get("class_id"), field="class_id")
    division_id = optional_int(payload.get("division_id"), field="division_id")

    student, _scoped = resolve_consumer_student(
        db,
        current_user,
        student_id=student_id,
        allow_unscoped_staff=False,
    )
    if student is None:
        raise validation("Please specify which student you are asking about.")

    resolved_student_id = int(student.id)
    class_id = class_id or student.class_id
    division_id = division_id or student.class_division_id

    if is_teacher_like(current_user, db) and not is_admin_like(current_user, db):
        _assert_teacher_scope(db, current_user, class_id, division_id)

    report = AttendanceService(db).get_attendance_report(
        current_user.tenant_id,
        from_date,
        to_date,
        class_id,
        division_id,
        resolved_student_id,
        100,
        0,
    )

    present = int(report.summary.total_present or 0)
    absent = int(report.summary.total_absent or 0)
    half_day = int(report.summary.total_half_day or 0)
    leave = int(report.summary.total_leave or 0)
    counted = present + absent + half_day + leave
    percentage = round((present / counted) * 100, 1) if counted else None

    recent = []
    for row in report.records[:10]:
        recent.append(
            {
                "date": as_date(row.date).isoformat() if as_date(row.date) else None,
                "status": row.status,
                "remarks": row.remarks,
            }
        )

    return {
        "action": "get_attendance",
        "student_name": student.student_name,
        "from_date": from_date.isoformat(),
        "to_date": to_date.isoformat(),
        "present_count": present,
        "absent_count": absent,
        "half_day_count": half_day,
        "leave_count": leave,
        "percentage": percentage,
        "recent_records": recent,
    }


def _assert_teacher_scope(
    db: Session,
    current_user: Any,
    class_id: Optional[int],
    division_id: Optional[int],
) -> None:
    if not class_id or not division_id:
        raise forbidden("You are not assigned to this class and division.")
    teacher = teacher_service.resolve_teacher_for_user(
        db,
        current_user.tenant_id,
        current_user.id,
        getattr(current_user, "email", None),
    )
    if not teacher:
        raise forbidden("Teacher profile not found.")
    pairs = teacher_service.get_teacher_class_division_pairs(
        db,
        current_user.tenant_id,
        teacher.id,
        None,
    )
    if (class_id, division_id) not in pairs:
        raise forbidden("You are not assigned to this class and division.")


def add_attendance(db: Session, current_user: Any, payload: dict[str, Any]) -> dict[str, Any]:
    try:
        return _add_attendance(db, current_user, payload or {})
    except Exception as exc:
        raise from_exception(exc) from exc


def _add_attendance(db: Session, current_user: Any, payload: dict[str, Any]) -> dict[str, Any]:
    require_staff_for_write(db, current_user, action="attendance")

    attendance_date = as_date(payload.get("attendance_date") or payload.get("date")) or date.today()
    class_id = optional_int(payload.get("class_id"), field="class_id")
    division_id = optional_int(
        payload.get("class_division_id") or payload.get("division_id"),
        field="class_division_id",
    )
    academic_year_id = optional_int(payload.get("academic_year_id"), field="academic_year_id")

    records_in = payload.get("records")
    built: list[AttendanceRecord] = []
    named: list[str] = []

    if isinstance(records_in, list) and records_in:
        if len(records_in) > 50:
            raise validation("Please mark attendance for at most 50 students at a time.")
        for raw in records_in:
            if not isinstance(raw, dict):
                raise validation("Each attendance record must include student and status.")
            student = resolve_student_for_write(
                db,
                current_user.tenant_id,
                raw,
                class_id=class_id,
                division_id=division_id,
            )
            class_id = class_id or student.class_id
            division_id = division_id or student.class_division_id
            academic_year_id = academic_year_id or student.academic_year_id
            status = _normalize_status(raw.get("status"))
            built.append(
                AttendanceRecord(
                    student_id=int(student.id),
                    status=status,
                    remarks=optional_str(raw.get("remarks")),
                )
            )
            named.append(student.student_name)
    else:
        student = resolve_student_for_write(
            db,
            current_user.tenant_id,
            payload,
            class_id=class_id,
            division_id=division_id,
        )
        class_id = class_id or student.class_id
        division_id = division_id or student.class_division_id
        academic_year_id = academic_year_id or student.academic_year_id
        status = _normalize_status(payload.get("status"))
        built.append(
            AttendanceRecord(
                student_id=int(student.id),
                status=status,
                remarks=optional_str(payload.get("remarks")),
            )
        )
        named.append(student.student_name)

    if not class_id or not division_id:
        raise validation("Please specify class_id and class_division_id for this student.")
    if academic_year_id is None:
        academic_year_id = homework_service.resolve_current_academic_year_id(
            db, current_user.tenant_id
        )
    if academic_year_id is None:
        raise validation("Please specify academic_year_id.")

    assert_teacher_class_division_access(
        db,
        current_user,
        int(class_id),
        int(division_id),
        int(academic_year_id),
    )

    req = MarkAttendanceRequest(
        tenant_id=current_user.tenant_id,
        academic_year_id=int(academic_year_id),
        class_id=int(class_id),
        class_division_id=int(division_id),
        attendance_date=attendance_date,
        records=built,
    )
    AttendanceService(db).mark_attendance(req, current_user)

    first = built[0]
    return {
        "action": "add_attendance",
        "attendance_date": attendance_date.isoformat(),
        "marked_count": len(built),
        "student_name": named[0] if len(named) == 1 else None,
        "student_id": first.student_id if len(built) == 1 else None,
        "status": first.status if len(built) == 1 else None,
        "students": [
            {"student_id": record.student_id, "student_name": name, "status": record.status}
            for record, name in zip(built, named)
        ],
    }


def _normalize_status(value: object) -> str:
    raw = optional_str(value)
    if not raw:
        raise validation("Please specify attendance status as Present or Absent.")
    key = raw.strip().lower()
    aliases = {
        "present": "Present",
        "p": "Present",
        "absent": "Absent",
        "a": "Absent",
    }
    status = aliases.get(key, raw.strip().title())
    if status not in ALLOWED_STUDENT_ATTENDANCE_STATUSES:
        raise validation("Attendance status must be Present or Absent.")
    return status
