from __future__ import annotations

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import CurrentUser, get_current_user, get_rbac_role_codes
from app.models.support import SupportQuery, SupportReleaseNote
from app.models.user import UserRole

SUPPORT_VIEW_ROLE_CODES = frozenset({
    "super_admin",
    "system_admin",
    "tenant_admin",
    "admin",
    "school_admin",
    "teacher",
    "student",
})

QUERY_ACCESS_ROLE_CODES = frozenset({
    "super_admin",
    "system_admin",
    "tenant_admin",
    "admin",
    "school_admin",
    "teacher",
})

STUDENT_ROLE_TOKENS = frozenset({"student", "students"})
TEACHER_ROLE_TOKENS = frozenset({"teacher", "teachers"})
ADMIN_ROLE_TOKENS = frozenset({
    "admin",
    "admins",
    "school_admin",
    "school admin",
    "tenant_admin",
    "tenant admin",
})


def _normalize_role(value: object | None) -> str:
    if value is None:
        return ""
    if hasattr(value, "value"):
        return str(value.value).strip().lower()  # type: ignore[union-attr]
    return str(value).strip().lower()


def _role_tokens(db: Session, user_id: int, legacy_role: object) -> set[str]:
    tokens = {_normalize_role(legacy_role)}
    tokens.update(_normalize_role(code) for code in get_rbac_role_codes(db, user_id))
    return {token for token in tokens if token}


def is_super_admin_user(db: Session, current_user: object) -> bool:
    legacy_role = getattr(current_user, "role", None)
    tenant_id = getattr(current_user, "tenant_id", None)
    user_id = int(getattr(current_user, "id"))

    if legacy_role in (UserRole.SUPER_ADMIN, UserRole.ADMIN) and tenant_id is None:
        return True
    if legacy_role == UserRole.SUPER_ADMIN:
        return True

    tokens = _role_tokens(db, user_id, legacy_role)
    return bool(tokens & {"super_admin", "system_admin"})


def resolve_actor_role(db: Session, current_user: object) -> str | None:
    if is_super_admin_user(db, current_user):
        return "SUPER_ADMIN"

    user_id = int(getattr(current_user, "id"))
    legacy_role = getattr(current_user, "role", None)
    tokens = _role_tokens(db, user_id, legacy_role)

    if tokens & STUDENT_ROLE_TOKENS:
        return "STUDENT"
    if tokens & TEACHER_ROLE_TOKENS:
        return "TEACHER"
    if tokens & ADMIN_ROLE_TOKENS or legacy_role in (UserRole.ADMIN, UserRole.TENANT_ADMIN):
        return "ADMIN"
    return None


def can_access_support(db: Session, current_user: object) -> bool:
    if is_super_admin_user(db, current_user):
        return True

    user_id = int(getattr(current_user, "id"))
    legacy_role = getattr(current_user, "role", None)
    tokens = _role_tokens(db, user_id, legacy_role)
    return bool(tokens & SUPPORT_VIEW_ROLE_CODES)


def can_access_queries(db: Session, current_user: object) -> bool:
    if is_super_admin_user(db, current_user):
        return True

    user_id = int(getattr(current_user, "id"))
    legacy_role = getattr(current_user, "role", None)
    tokens = _role_tokens(db, user_id, legacy_role)
    if tokens & STUDENT_ROLE_TOKENS:
        return False
    return bool(tokens & QUERY_ACCESS_ROLE_CODES)


def can_manage_release_notes(db: Session, current_user: object) -> bool:
    return is_super_admin_user(db, current_user)


def resolve_support_tenant_id(db: Session, current_user: object) -> int | None:
    """Return tenant scope for support queries. None = all tenants (platform super admin)."""
    tenant_id = getattr(current_user, "tenant_id", None)
    if tenant_id is not None:
        return int(tenant_id)
    if is_super_admin_user(db, current_user):
        return None
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Tenant context is required",
    )


def require_tenant_id(current_user: object) -> int:
    tenant_id = getattr(current_user, "tenant_id", None)
    if tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant context is required",
        )
    return int(tenant_id)


def can_view_query(db: Session, current_user: object, row: SupportQuery) -> bool:
    actor_role = resolve_actor_role(db, current_user)
    user_id = int(getattr(current_user, "id"))
    if not actor_role:
        return False

    if row.created_by == user_id:
        return True

    if actor_role == "ADMIN" and row.created_by_role in ("STUDENT", "TEACHER"):
        return True

    if actor_role == "SUPER_ADMIN" and (
        row.created_by_role in ("ADMIN", "TEACHER")
        or bool(row.forwarded_to_super_admin)
    ):
        return True

    return False


def is_query_owner(db: Session, current_user: object, row: SupportQuery) -> bool:
    actor_role = resolve_actor_role(db, current_user)
    if not actor_role:
        return False
    return row.created_by_role == actor_role and row.created_by == int(getattr(current_user, "id"))


def can_forward_query(db: Session, current_user: object, row: SupportQuery) -> bool:
    actor_role = resolve_actor_role(db, current_user)
    return (
        actor_role == "ADMIN"
        and row.created_by_role == "STUDENT"
        and not row.forwarded_to_super_admin
    )


def can_view_release_note(db: Session, current_user: object, row: SupportReleaseNote) -> bool:
    if is_super_admin_user(db, current_user):
        return True

    actor_role = resolve_actor_role(db, current_user)
    if not actor_role:
        return False

    if actor_role in ("SUPER_ADMIN", "ADMIN"):
        return bool(row.show_to_admin)
    if actor_role == "TEACHER":
        return bool(row.show_to_teacher)
    if actor_role == "STUDENT":
        return bool(row.show_to_student)
    return False


def require_support_view(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CurrentUser:
    if not can_access_support(db, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    return current_user


def require_query_access(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CurrentUser:
    if not can_access_queries(db, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    return current_user


def require_release_note_manage(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CurrentUser:
    if not can_manage_release_notes(db, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    return current_user
