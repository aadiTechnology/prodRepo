from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from app.core.database import get_db
from app.schemas.school_class_schema import SchoolClassResponse
from app.services import school_class_service

router = APIRouter(prefix="/api/classes", tags=["Classes"])

def get_tenant_id():
    # Example: extract from token/session
    return 1

@router.get("/", response_model=List[SchoolClassResponse])
def list_classes(
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id)
):
    return school_class_service.get_all_classes(db, tenant_id)