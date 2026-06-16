"""Resolve a unique login email for a student user (prefer parent email)."""

from __future__ import annotations


def normalize_email(email: str | None) -> str:
    return (email or "").strip().lower()


def resolve_student_login_email(
    parent_email: str | None,
    admission_no: str,
    taken: set[str],
) -> str:
    """
    Prefer parent email from student/parent record.
    If already used (siblings), use plus-tag: parent+adm-21-000001@domain.com
    """
    admission_key = (admission_no or "").strip().lower()
    base = normalize_email(parent_email)

    if not base or "@" not in base:
        base = f"{admission_key}@student.local"

    if base not in taken:
        taken.add(base)
        return base

    local, domain = base.rsplit("@", 1)
    tag = admission_key.replace("+", "").replace("@", "")
    candidate = f"{local}+{tag}@{domain}"
    suffix = 1
    while candidate in taken:
        candidate = f"{local}+{tag}{suffix}@{domain}"
        suffix += 1

    taken.add(candidate)
    return candidate
