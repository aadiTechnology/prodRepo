"""Teacher scope checks for attendance endpoints."""

from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_rbac_role_codes, SYSTEM_ADMIN_ROLE_CODE
from app.models.user import UserRole
from app.services import teacher_service


def is_admin_like(current_user, db: Session) -> bool:
    if current_user.role in [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN]:
        return True
    role_codes = get_rbac_role_codes(db, current_user.id)
    return any(
        code in role_codes
        for code in ["admin", "tenant_admin", SYSTEM_ADMIN_ROLE_CODE.lower()]
    )


def is_teacher_like(current_user, db: Session) -> bool:
    if str(getattr(current_user, "role", "") or "").upper() == "TEACHER":
        return True
    role_codes = get_rbac_role_codes(db, current_user.id)
    return "teacher" in role_codes


def assert_teacher_class_division_access(
    db: Session,
    current_user,
    class_id: int,
    division_id: int,
    academic_year_id: Optional[int] = None,
) -> None:
    """Raise 403 if the current user is a teacher not assigned to class/division."""
    if is_admin_like(current_user, db):
        return
    if not is_teacher_like(current_user, db):
        return

    teacher = teacher_service.resolve_teacher_for_user(
        db,
        current_user.tenant_id,
        current_user.id,
        getattr(current_user, "email", None),
    )
    if not teacher:
        raise HTTPException(status_code=403, detail="Teacher profile not found")

    pairs = teacher_service.get_teacher_class_division_pairs(
        db,
        current_user.tenant_id,
        teacher.id,
        academic_year_id,
    )
    if not pairs:
        raise HTTPException(
            status_code=403,
            detail="No class assignment found for this teacher",
        )
    if (class_id, division_id) not in pairs:
        raise HTTPException(
            status_code=403,
            detail="You are not assigned to this class and division",
        )
