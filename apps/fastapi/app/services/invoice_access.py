from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.exceptions import ForbiddenException
from app.services.homework_access import (
    _resolve_parent_students,
    _resolve_student_record,
    is_parent_user,
    is_student_user,
    resolve_homework_viewer_context,
)
from app.repositories import homework_repository as homework_repo


def get_invoice_scope_student_ids(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    email: str,
    legacy_role: object,
) -> list[int] | None:
    """
    None — staff/unrestricted invoice access.
    Non-empty list — consumer may only access these student_ids.
    Empty list — consumer with no linked student record.
    """
    teacher_id = homework_repo._resolve_teacher_id(db, tenant_id, user_id)
    ctx = resolve_homework_viewer_context(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        email=email,
        legacy_role=legacy_role,
        teacher_id=teacher_id,
    )

    if ctx.kind == "student":
        student = _resolve_student_record(
            db, tenant_id=tenant_id, user_id=user_id, email=email
        )
        return [int(student.id)] if student else []

    if ctx.kind == "parent":
        children = _resolve_parent_students(
            db, tenant_id=tenant_id, user_id=user_id, email=email
        )
        return [int(s.id) for s in children]

    return None


def is_invoice_consumer(
    db: Session,
    *,
    user_id: int,
    legacy_role: object,
) -> bool:
    return is_student_user(db, user_id, legacy_role) or is_parent_user(
        db, user_id, legacy_role
    )


def assert_invoice_staff_access(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    email: str,
    legacy_role: object,
) -> None:
    scoped_ids = get_invoice_scope_student_ids(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        email=email,
        legacy_role=legacy_role,
    )
    if scoped_ids is not None:
        raise ForbiddenException("Insufficient permissions")


def assert_invoice_row_access(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    email: str,
    legacy_role: object,
    student_id: int,
) -> None:
    scoped_ids = get_invoice_scope_student_ids(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        email=email,
        legacy_role=legacy_role,
    )
    if scoped_ids is None:
        return
    if int(student_id) not in scoped_ids:
        raise ForbiddenException("Insufficient permissions")
