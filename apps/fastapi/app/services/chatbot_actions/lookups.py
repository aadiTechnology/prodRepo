"""Resolve class, subject, division, and student from chatbot payloads."""

from __future__ import annotations

from typing import Any, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.academic import ClassDivision, SchoolClass
from app.models.student import Student
from app.models.subject import Subject
from app.services.chatbot_actions.errors import validation
from app.services.chatbot_actions.scope import optional_int, optional_str


def _lower(value: str) -> str:
    return value.strip().lower()


def resolve_class_id(
    db: Session,
    tenant_id: int,
    payload: dict[str, Any],
) -> int:
    class_id = optional_int(payload.get("class_id"), field="class_id")
    class_name = optional_str(payload.get("class_name"))
    if class_id is not None:
        row = (
            db.query(SchoolClass)
            .filter(
                SchoolClass.id == class_id,
                SchoolClass.tenant_id == tenant_id,
                SchoolClass.is_deleted == False,  # noqa: E712
            )
            .first()
        )
        if row is None:
            raise validation("That class was not found.")
        return int(row.id)
    if not class_name:
        raise validation("Please specify class_id or class_name.")
    return _unique_id(
        _class_matches(db, tenant_id, class_name),
        label="class",
        field_hint="class_id",
        name_attr="name",
    )


def resolve_subject_id(
    db: Session,
    tenant_id: int,
    payload: dict[str, Any],
    *,
    class_id: Optional[int] = None,
) -> int:
    subject_id = optional_int(payload.get("subject_id"), field="subject_id")
    subject_name = optional_str(payload.get("subject_name"))
    if subject_id is not None:
        row = (
            db.query(Subject)
            .filter(
                Subject.id == subject_id,
                Subject.tenant_id == tenant_id,
                Subject.is_deleted == False,  # noqa: E712
            )
            .first()
        )
        if row is None:
            raise validation("That subject was not found.")
        return int(row.id)
    if not subject_name:
        raise validation("Please specify subject_id or subject_name.")
    query = db.query(Subject).filter(
        Subject.tenant_id == tenant_id,
        Subject.is_deleted == False,  # noqa: E712
        func.lower(Subject.name) == _lower(subject_name),
    )
    if class_id is not None:
        scoped = query.filter(
            (Subject.class_id == class_id) | (Subject.class_id.is_(None))
        ).all()
        if len(scoped) == 1:
            return int(scoped[0].id)
        if len(scoped) > 1:
            query = db.query(Subject).filter(
                Subject.tenant_id == tenant_id,
                Subject.is_deleted == False,  # noqa: E712
                Subject.class_id == class_id,
                func.lower(Subject.name) == _lower(subject_name),
            )
    return _unique_id(query.all(), label="subject", field_hint="subject_id", name_attr="name")


def resolve_division_id(
    db: Session,
    *,
    class_id: int,
    payload: dict[str, Any],
) -> Optional[int]:
    division_id = optional_int(
        payload.get("class_division_id") or payload.get("division_id"),
        field="class_division_id",
    )
    division_name = optional_str(
        payload.get("division_name") or payload.get("class_division_name")
    )
    if division_id is not None:
        row = (
            db.query(ClassDivision)
            .filter(
                ClassDivision.id == division_id,
                ClassDivision.class_id == class_id,
                ClassDivision.is_active == True,  # noqa: E712
            )
            .first()
        )
        if row is None:
            raise validation("That class division was not found.")
        return int(row.id)
    if not division_name:
        return None
    matches = (
        db.query(ClassDivision)
        .filter(
            ClassDivision.class_id == class_id,
            ClassDivision.is_active == True,  # noqa: E712
            func.lower(ClassDivision.division_name) == _lower(division_name),
        )
        .all()
    )
    return _unique_id(
        matches, label="division", field_hint="class_division_id", name_attr="division_name"
    )


def resolve_student_for_write(
    db: Session,
    tenant_id: int,
    payload: dict[str, Any],
    *,
    class_id: Optional[int] = None,
    division_id: Optional[int] = None,
) -> Student:
    student_id = optional_int(payload.get("student_id"), field="student_id")
    student_name = optional_str(payload.get("student_name"))
    query = db.query(Student).filter(
        Student.tenant_id == tenant_id,
        Student.is_active == True,  # noqa: E712
    )
    if student_id is not None:
        student = query.filter(Student.id == student_id).first()
        if student is None:
            raise validation("That student was not found.")
        return student
    if not student_name:
        raise validation("Please specify student_id or student_name.")
    if class_id is not None:
        query = query.filter(Student.class_id == class_id)
    if division_id is not None:
        query = query.filter(Student.class_division_id == division_id)
    exact = query.filter(func.lower(Student.student_name) == _lower(student_name)).all()
    if len(exact) == 1:
        return exact[0]
    if len(exact) > 1:
        raise validation(_ambiguous_message(exact, "student", "student_id", "student_name"))
    if len(student_name) < 2:
        raise validation("Please specify which student you mean.")
    fuzzy = query.filter(func.lower(Student.student_name).like(f"%{_lower(student_name)}%")).all()
    if len(fuzzy) == 1:
        return fuzzy[0]
    if not fuzzy:
        raise validation("That student was not found.")
    raise validation(_ambiguous_message(fuzzy, "student", "student_id", "student_name"))


def _class_matches(db: Session, tenant_id: int, class_name: str) -> list[SchoolClass]:
    exact = (
        db.query(SchoolClass)
        .filter(
            SchoolClass.tenant_id == tenant_id,
            SchoolClass.is_deleted == False,  # noqa: E712
            func.lower(SchoolClass.name) == _lower(class_name),
        )
        .all()
    )
    if exact:
        return exact
    return (
        db.query(SchoolClass)
        .filter(
            SchoolClass.tenant_id == tenant_id,
            SchoolClass.is_deleted == False,  # noqa: E712
            func.lower(SchoolClass.name).like(f"%{_lower(class_name)}%"),
        )
        .all()
    )


def _unique_id(rows: list[Any], *, label: str, field_hint: str, name_attr: str) -> int:
    if len(rows) == 1:
        return int(rows[0].id)
    if not rows:
        raise validation(f"That {label} was not found.")
    raise validation(_ambiguous_message(rows, label, field_hint, name_attr))


def _ambiguous_message(rows: list[Any], label: str, id_field: str, name_attr: str) -> str:
    bits = []
    for row in rows[:5]:
        name = getattr(row, name_attr, None) or label
        bits.append(f"{name} ({id_field}={row.id})")
    extra = "" if len(rows) <= 5 else " and more"
    return (
        f"Several {label}s matched. Please specify {id_field}. "
        f"Matches: {', '.join(bits)}{extra}."
    )
