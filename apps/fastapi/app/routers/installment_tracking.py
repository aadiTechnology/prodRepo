from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import CurrentUser, get_current_user, get_rbac_role_codes
from app.core.exceptions import ForbiddenException
from app.schemas.installment_tracking import StudentSearchItem
from app.services.installment_tracking_service import search_students

router = APIRouter(prefix="/fees/installment-tracking", tags=["Fees - Installment Tracking"])

ALLOWED_ROLE_CODES = {"accounts_admin", "tenant_admin", "admin", "system_admin", "super_admin"}


def require_installment_tracking_access(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CurrentUser:
    """
    Allow Accounts Admin / Tenant Admin as per user story.
    Supports both legacy `users.role` and RBAC role codes.
    """
    legacy = str(getattr(current_user.role, "value", current_user.role)).lower()
    if legacy in ALLOWED_ROLE_CODES:
        return current_user

    codes = set(get_rbac_role_codes(db, current_user.id))
    if codes & ALLOWED_ROLE_CODES:
        return current_user

    raise ForbiddenException("Insufficient permissions")


@router.get("/students", response_model=list[StudentSearchItem])
async def students(
    search: str = Query("", min_length=0),
    class_id: int | None = Query(None),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_installment_tracking_access),
):
    return search_students(
        db=db,
        tenant_id=current_user.tenant_id,
        search=search,
        class_id=class_id,
        limit=limit,
    )

