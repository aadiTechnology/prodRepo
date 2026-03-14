from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_admin, CurrentUser
from app.schemas.fee import FeeCategoryResponse, FeeCategoryCreate, FeeCategoryUpdate
from app.services import fee_service

router = APIRouter(prefix="/api/fee-categories", tags=["Fee Categories"])


@router.get("", response_model=list[FeeCategoryResponse])
@router.get("/", response_model=list[FeeCategoryResponse])
def list_fee_categories(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    return fee_service.get_fee_categories(db, current_user.tenant_id)


@router.get("/{category_id}", response_model=FeeCategoryResponse)
def get_fee_category(
    category_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    return fee_service.get_fee_category(db, current_user.tenant_id, category_id)


@router.post("", response_model=FeeCategoryResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=FeeCategoryResponse, status_code=status.HTTP_201_CREATED)
def create_fee_category(
    category: FeeCategoryCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin),
):
    return fee_service.create_fee_category(db, category, current_user.tenant_id, current_user.id)


@router.put("/{category_id}", response_model=FeeCategoryResponse)
@router.patch("/{category_id}", response_model=FeeCategoryResponse)
def update_fee_category(
    category_id: str,
    category: FeeCategoryUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin),
):
    return fee_service.update_fee_category(db, category_id, category, current_user.tenant_id, current_user.id)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_fee_category(
    category_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin),
):
    fee_service.delete_fee_category(db, category_id, current_user.tenant_id, current_user.id)
    return None
