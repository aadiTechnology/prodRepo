"""Chatbot actions: get_homework and add_homework."""

from __future__ import annotations

from datetime import date
from typing import Any

from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.schemas.homework_schema import HomeworkCreate
from app.services import homework_service
from app.services.chatbot_actions.errors import forbidden, from_exception, validation
from app.services.chatbot_actions.lookups import (
    resolve_class_id,
    resolve_division_id,
    resolve_subject_id,
)
from app.services.chatbot_actions.scope import (
    as_date,
    cap_limit,
    class_filters_in_scope,
    optional_int,
    optional_str,
    require_staff_for_write,
    resolve_consumer_student,
)
from app.services.homework_access import is_parent_user, is_student_user
from app.utils.homework_status import HOMEWORK_STATUS_ACTIVE, from_db_homework_status


def get_homework(db: Session, current_user: Any, payload: dict[str, Any]) -> dict[str, Any]:
    try:
        return _get_homework(db, current_user, payload or {})
    except Exception as exc:
        raise from_exception(exc) from exc


def _get_homework(db: Session, current_user: Any, payload: dict[str, Any]) -> dict[str, Any]:
    assigned_date = as_date(payload.get("assigned_date"))
    academic_year_id = optional_int(payload.get("academic_year_id"), field="academic_year_id")
    class_id = optional_int(payload.get("class_id"), field="class_id")
    class_division_id = optional_int(
        payload.get("class_division_id"), field="class_division_id"
    )
    subject_id = optional_int(payload.get("subject_id"), field="subject_id")
    student_id = optional_int(payload.get("student_id"), field="student_id")
    limit = cap_limit(payload.get("limit"), default=10, maximum=20)

    if is_student_user(db, current_user.id, current_user.role):
        student_id = None

    viewer = homework_service.get_viewer_context(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        email=str(current_user.email),
        legacy_role=current_user.role,
    )

    if is_parent_user(db, current_user.id, current_user.role) and student_id is not None:
        child, _scoped = resolve_consumer_student(
            db, current_user, student_id=student_id, allow_unscoped_staff=False
        )
        if child is not None:
            class_id = child.class_id
            class_division_id = child.class_division_id

    class_id, class_division_id, subject_id = class_filters_in_scope(
        viewer, class_id, class_division_id, subject_id
    )

    if academic_year_id is None:
        academic_year_id = homework_service.resolve_current_academic_year_id(
            db, current_user.tenant_id
        )

    items, _total = homework_service.list_homework(
        db,
        tenant_id=current_user.tenant_id,
        class_id=class_id,
        class_division_id=class_division_id,
        subject_id=subject_id,
        academic_year_id=academic_year_id,
        skip=0,
        limit=200,
        viewer_context=viewer,
    )

    rows: list[dict[str, Any]] = []
    for hw in items:
        hw_assigned = as_date(hw.assigned_date)
        if assigned_date is not None and hw_assigned != assigned_date:
            continue
        attachment_count = len(getattr(hw, "attachments", None) or [])
        rows.append(
            {
                "homework_id": int(hw.id),
                "title": hw.title,
                "instructions": hw.instructions,
                "subject_name": hw.subject.name if hw.subject else None,
                "class_name": hw.class_model.name if hw.class_model else None,
                "division_name": hw.division.division_name if hw.division else None,
                "teacher_name": hw.teacher.full_name if hw.teacher else None,
                "assigned_date": hw_assigned.isoformat() if hw_assigned else None,
                "submission_date": as_date(hw.submission_date).isoformat()
                if as_date(hw.submission_date)
                else None,
                "status": from_db_homework_status(hw.status),
                "attachment_count": attachment_count,
            }
        )
        if len(rows) >= limit:
            break

    return {"action": "get_homework", "items": rows, "count": len(rows)}


def add_homework(db: Session, current_user: Any, payload: dict[str, Any]) -> dict[str, Any]:
    try:
        return _add_homework(db, current_user, payload or {})
    except Exception as exc:
        raise from_exception(exc) from exc


def _add_homework(db: Session, current_user: Any, payload: dict[str, Any]) -> dict[str, Any]:
    require_staff_for_write(db, current_user, action="homework")

    title = optional_str(payload.get("title"))
    if not title:
        raise validation("Please provide a homework title.")

    class_id = resolve_class_id(db, current_user.tenant_id, payload)
    subject_id = resolve_subject_id(db, current_user.tenant_id, payload, class_id=class_id)
    class_division_id = resolve_division_id(db, class_id=class_id, payload=payload)

    viewer = homework_service.get_viewer_context(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        email=str(current_user.email),
        legacy_role=current_user.role,
    )
    scoped_class, scoped_division, scoped_subject = class_filters_in_scope(
        viewer, class_id, class_division_id, subject_id
    )
    if viewer.kind != "admin" and (
        scoped_class is None or scoped_subject is None or scoped_subject != subject_id
    ):
        raise forbidden("You can only add homework for classes and subjects you teach.")

    academic_year_id = optional_int(payload.get("academic_year_id"), field="academic_year_id")
    if academic_year_id is None:
        academic_year_id = homework_service.resolve_current_academic_year_id(
            db, current_user.tenant_id
        )
    if academic_year_id is None:
        raise validation("Please specify academic_year_id.")

    assigned_date = as_date(payload.get("assigned_date")) or date.today()
    submission_date = as_date(payload.get("submission_date"))
    notify_parents = _as_bool(payload.get("notify_parents"), default=False)
    status = optional_str(payload.get("status")) or HOMEWORK_STATUS_ACTIVE
    teacher_id = optional_int(payload.get("teacher_id"), field="teacher_id")
    instructions = optional_str(payload.get("instructions"))

    try:
        create_payload = HomeworkCreate(
            teacher_id=teacher_id,
            class_id=class_id,
            class_division_id=class_division_id,
            subject_id=subject_id,
            academic_year_id=academic_year_id,
            title=title,
            instructions=instructions,
            assigned_date=assigned_date,
            submission_date=submission_date,
            notify_parents=notify_parents,
            status=status,
        )
    except ValidationError as exc:
        raise validation(_first_validation_error(exc)) from exc

    hw = homework_service.create_homework(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        payload=create_payload,
    )
    assigned = as_date(hw.assigned_date)
    due = as_date(hw.submission_date)
    return {
        "action": "add_homework",
        "homework_id": int(hw.id),
        "title": hw.title,
        "subject_name": hw.subject.name if hw.subject else None,
        "class_name": hw.class_model.name if hw.class_model else None,
        "division_name": hw.division.division_name if hw.division else None,
        "assigned_date": assigned.isoformat() if assigned else None,
        "submission_date": due.isoformat() if due else None,
        "status": from_db_homework_status(hw.status),
    }


def _as_bool(value: object, *, default: bool) -> bool:
    if value is None or value == "":
        return default
    if isinstance(value, bool):
        return value
    text = str(value).strip().lower()
    if text in {"1", "true", "yes", "y"}:
        return True
    if text in {"0", "false", "no", "n"}:
        return False
    raise validation("notify_parents must be true or false.")


def _first_validation_error(exc: ValidationError) -> str:
    errors = exc.errors()
    if not errors:
        return "Some of the requested details were invalid."
    err = errors[0]
    loc = ".".join(str(part) for part in err.get("loc") or () if part != "body")
    msg = str(err.get("msg") or "invalid")
    return f"{loc}: {msg}" if loc else msg
