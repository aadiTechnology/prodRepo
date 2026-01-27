"""Feature (permission) CRUD endpoints."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.dependencies import require_admin, CurrentUser
from app.schemas.feature import FeatureCreate, FeatureUpdate, FeatureResponse
from app.services import feature_service


router = APIRouter(prefix="/features", tags=["Features"])


@router.get("/", response_model=List[FeatureResponse])
async def list_features(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin),
) -> List[FeatureResponse]:
    """List all features."""
    return feature_service.get_features(db)


@router.get("/{feature_id}", response_model=FeatureResponse)
async def get_feature(
    feature_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin),
) -> FeatureResponse:
    """Get a single feature."""
    return feature_service.get_feature(db, feature_id)


@router.post("/", response_model=FeatureResponse, status_code=status.HTTP_201_CREATED)
async def create_feature(
    data: FeatureCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin),
) -> FeatureResponse:
    """Create a new feature."""
    return feature_service.create_feature(db, data, created_by=current_user.id)


@router.put("/{feature_id}", response_model=FeatureResponse)
async def update_feature(
    feature_id: int,
    data: FeatureUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin),
) -> FeatureResponse:
    """Update an existing feature."""
    return feature_service.update_feature(db, feature_id, data, updated_by=current_user.id)


@router.delete("/{feature_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_feature(
    feature_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin),
) -> None:
    """Soft delete a feature."""
    feature_service.soft_delete_feature(db, feature_id, deleted_by=current_user.id)
    return None

