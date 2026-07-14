from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_admin, CurrentUser
from app.schemas.academic import ClassCreate, ClassResponse
from app.services import academic_service
from app.core.logging_config import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/academic", tags=["Academic"])

@router.get("/classes", response_model=list[ClassResponse])
async def read_classes(
    academic_year_id: int = None,
    active_only: bool = Query(
        default=True,
        description="When true (default), only active classes/divisions for dropdowns.",
    ),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    return academic_service.get_classes(
        db,
        current_user.tenant_id,
        academic_year_id,
        active_only=active_only,
    )

@router.post("/classes", response_model=ClassResponse, status_code=201)
async def create_class(
    cls: ClassCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin)
):
    return academic_service.create_class(db, cls, current_user.tenant_id, current_user.id)
