from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_admin
from app.schemas.auth import CurrentUser
from app.schemas.school_class_schema import SchoolClassResponse
from app.services import school_class_service

router = APIRouter(prefix="/api/classes", tags=["Classes"])

@router.get("/", response_model=List[SchoolClassResponse])
def list_classes(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="User does not belong to a tenant")
    return school_class_service.get_all_classes(db, current_user.tenant_id)