"""Shared student/role helpers for chatbot actions."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.models.student import Student
from app.services.chatbot_actions.errors import forbidden, no_linked_student, validation
from app.services.homework_access import (
    HomeworkViewerContext,
    _resolve_parent_students,
    _resolve_student_record,
    is_parent_user,
    is_student_user,
)
from app.services.invoice_access import get_invoice_scope_student_ids


def as_date(value: object) -> Optional[date]:
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    text = str(value).strip()[:10]
    try:
        return date.fromisoformat(text)
    except ValueError as exc:
        raise validation("Dates must use YYYY-MM-DD.") from exc


def optional_int(value: object, *, field: str) -> Optional[int]:
    if value is None or value == "":
        return None
    try:
        number = int(value)
    except (TypeError, ValueError) as exc:
        raise validation(f"{field} must be a number.") from exc
    if number < 1:
        raise validation(f"{field} must be a positive number.")
    return number


def optional_str(value: object) -> Optional[str]:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def require_staff_for_write(db: Session, current_user: Any, *, action: str) -> None:
    """Parents and students may view records but cannot create or mark them."""
    if is_student_user(db, current_user.id, current_user.role) or is_parent_user(
        db, current_user.id, current_user.role
    ):
        raise forbidden(
            f"Parents and students can view {action}, but cannot add or change it."
        )


def cap_limit(value: object, *, default: int = 10, maximum: int = 20) -> int:
    if value is None or value == "":
        return default
    try:
        number = int(value)
    except (TypeError, ValueError) as exc:
        raise validation("limit must be a number.") from exc
    if number < 1:
        raise validation("limit must be at least 1.")
    return min(number, maximum)


def resolve_consumer_student(
    db: Session,
    current_user: Any,
    *,
    student_id: Optional[int],
    allow_unscoped_staff: bool,
) -> tuple[Optional[Student], Optional[list[int]]]:
    """Resolve the student the caller may ask about.

    Returns (student, scoped_ids). scoped_ids is None for staff.
    """
    tenant_id = current_user.tenant_id
    user_id = current_user.id
    email = str(current_user.email or "")
    legacy_role = current_user.role

    if is_student_user(db, user_id, legacy_role):
        student = _resolve_student_record(
            db, tenant_id=tenant_id, user_id=user_id, email=email
        )
        if student is None:
            raise no_linked_student()
        if student_id is not None and int(student_id) != int(student.id):
            raise validation("Students can only view their own records.")
        return student, [int(student.id)]

    if is_parent_user(db, user_id, legacy_role):
        children = _resolve_parent_students(
            db, tenant_id=tenant_id, user_id=user_id, email=email
        )
        if not children:
            raise no_linked_student()
        child_ids = [int(child.id) for child in children]
        if student_id is None:
            if len(children) == 1:
                return children[0], child_ids
            raise validation("Please specify which child you are asking about.")
        for child in children:
            if int(child.id) == int(student_id):
                return child, child_ids
        raise validation("That student is not linked to this parent account.")

    scoped = get_invoice_scope_student_ids(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        email=email,
        legacy_role=legacy_role,
    )
    if scoped is not None:
        if not scoped:
            raise no_linked_student()
        if student_id is None:
            if len(scoped) == 1:
                student = db.query(Student).filter(Student.id == scoped[0]).first()
                return student, scoped
            raise validation("Please specify which student you are asking about.")
        if int(student_id) not in scoped:
            raise validation("That student is not in your account scope.")
        student = db.query(Student).filter(Student.id == int(student_id)).first()
        return student, scoped

    if student_id is None:
        if allow_unscoped_staff:
            return None, None
        raise validation("Please specify which student you are asking about.")
    student = (
        db.query(Student)
        .filter(
            Student.id == int(student_id),
            Student.tenant_id == tenant_id,
            Student.is_active == True,  # noqa: E712
        )
        .first()
    )
    if student is None:
        raise no_linked_student("Student was not found.")
    return student, None


def class_filters_in_scope(
    ctx: HomeworkViewerContext,
    class_id: Optional[int],
    class_division_id: Optional[int],
    subject_id: Optional[int],
) -> tuple[Optional[int], Optional[int], Optional[int]]:
    if ctx.kind == "admin" or not ctx.scopes:
        if ctx.kind == "admin":
            return class_id, class_division_id, subject_id
        return None, None, None
    if class_id is None:
        return None, None, subject_id
    for scope in ctx.scopes:
        if scope.class_id != class_id:
            continue
        if class_division_id is not None and scope.class_division_id not in (
            None,
            class_division_id,
        ):
            continue
        if (
            subject_id is not None
            and scope.allowed_subject_ids is not None
            and subject_id not in scope.allowed_subject_ids
        ):
            continue
        return class_id, class_division_id, subject_id
    return None, None, None
