from __future__ import annotations

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import CurrentUser, get_current_user, get_rbac_role_codes
from app.models.user import UserRole

SUPPORT_VIEW_ROLE_CODES = frozenset({
    "super_admin",
    "system_admin",
    "tenant_admin",
    "admin",
    "school_admin",
    "teacher",
})

FAQ_MANAGE_ROLE_CODES = frozenset({
    "super_admin",
    "system_admin",
    "tenant_admin",
    "admin",
    "school_admin",
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


def can_view_support(db: Session, current_user: object) -> bool:
    if is_super_admin_user(db, current_user):
        return True

    legacy_role = getattr(current_user, "role", None)
    user_id = int(getattr(current_user, "id"))
    tokens = _role_tokens(db, user_id, legacy_role)
    return bool(tokens & SUPPORT_VIEW_ROLE_CODES)


def can_manage_faqs(db: Session, current_user: object) -> bool:
    if is_super_admin_user(db, current_user):
        return True

    legacy_role = getattr(current_user, "role", None)
    if legacy_role in (UserRole.ADMIN, UserRole.TENANT_ADMIN):
        return getattr(current_user, "tenant_id", None) is not None

    user_id = int(getattr(current_user, "id"))
    tokens = _role_tokens(db, user_id, legacy_role)
    return bool(tokens & FAQ_MANAGE_ROLE_CODES)


def can_manage_product_updates(db: Session, current_user: object) -> bool:
    return is_super_admin_user(db, current_user)


def resolve_faq_tenant_filter(
    db: Session,
    current_user: object,
    requested_tenant_id: int | None,
) -> int | None:
    """Return tenant_id filter for FAQ queries. None means all tenants (super admin only)."""
    if is_super_admin_user(db, current_user):
        return requested_tenant_id

    tenant_id = getattr(current_user, "tenant_id", None)
    if tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant context is required",
        )
    return int(tenant_id)


def resolve_faq_write_tenant_id(
    db: Session,
    current_user: object,
    requested_tenant_id: int | None,
) -> int:
    if is_super_admin_user(db, current_user):
        if requested_tenant_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="tenant_id is required for super admin FAQ operations",
            )
        return requested_tenant_id

    tenant_id = getattr(current_user, "tenant_id", None)
    if tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant context is required",
        )
    return int(tenant_id)


def require_support_view(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CurrentUser:
    if not can_view_support(db, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    return current_user


def require_faq_manage(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CurrentUser:
    if not can_manage_faqs(db, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    return current_user


def require_product_update_manage(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CurrentUser:
    if not can_manage_product_updates(db, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    return current_user
