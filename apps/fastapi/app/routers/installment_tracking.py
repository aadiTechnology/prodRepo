from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import CurrentUser, get_current_user, get_rbac_role_codes
from app.core.exceptions import ForbiddenException
from app.services.homework_access import is_parent_user, is_student_user
from app.models.student import Student
from app.models.academic import SchoolClass

router = APIRouter(prefix="/fees/installment-tracking", tags=["Fees - Installment Tracking"])

ALLOWED_ROLE_CODES = {"accounts_admin", "tenant_admin", "admin", "system_admin", "super_admin"}


class StudentSearchItem(BaseModel):
    id: int
    student_name: str
    student_code: Optional[str] = None
    admission_no: Optional[str] = None
    roll_no: Optional[str] = None
    class_id: Optional[int] = None
    class_name: Optional[str] = None


def require_installment_tracking_access(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CurrentUser:
    legacy = str(getattr(current_user.role, "value", current_user.role)).lower()
    if legacy in ALLOWED_ROLE_CODES:
        return current_user

    codes = set(get_rbac_role_codes(db, current_user.id))
    if codes & ALLOWED_ROLE_CODES:
        return current_user

    if is_student_user(db, current_user.id, current_user.role):
        return current_user
    if is_parent_user(db, current_user.id, current_user.role):
        return current_user

    raise ForbiddenException("Insufficient permissions")


def search_students(
    *,
    db: Session,
    tenant_id: int,
    search: str = "",
    class_id: int | None = None,
    class_name: str | None = None,
    limit: int = 10,
) -> list[StudentSearchItem]:
    q = db.query(Student).filter(Student.tenant_id == tenant_id)
    
    if class_id:
        q = q.filter(Student.class_id == class_id)
    elif class_name:
        q = q.join(Student.class_model).filter(SchoolClass.name == class_name)
    
    if search:
        s = f"%{search.strip()}%"
        q = q.filter(
            (Student.student_name.ilike(s))
            | (Student.student_code.ilike(s))
            | (Student.admission_no.ilike(s))
            | (Student.roll_no.ilike(s))
        )

    q = q.order_by(Student.student_name.asc()).limit(limit)
    
    out: list[StudentSearchItem] = []
    for st in q.all():
        cls = getattr(st, "class_", None) or getattr(st, "class_model", None)
        class_name = None
        if cls:
            name = getattr(cls, "name", None) or ""
            section = getattr(cls, "section", None)
            class_name = f"{name} - {section}" if section else (name or None)
        out.append(
            StudentSearchItem(
                id=st.id,
                student_name=st.student_name,
                student_code=st.student_code,
                admission_no=st.admission_no,
                roll_no=st.roll_no,
                class_id=st.class_id,
                class_name=class_name,
            )
        )
    return out


@router.get("/students", response_model=list[StudentSearchItem])
async def students(
    search: str = Query("", min_length=0),
    class_id: int | None = Query(None),
    class_name: str | None = Query(None),
    tenant_id: int | None = Query(None),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_installment_tracking_access),
):
    # Use provided tenant_id (for debugging/flexibility) or fallback to current_user.tenant_id
    effective_tenant_id = tenant_id if tenant_id is not None else current_user.tenant_id
    
    return search_students(
        db=db,
        tenant_id=effective_tenant_id,
        search=search,
        class_id=class_id,
        class_name=class_name,
        limit=limit,
    )
