from __future__ import annotations

from typing import List
from fastapi import APIRouter, Depends, status, HTTPException

from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import CurrentUser, get_current_user
from app.schemas.marketing_hub import (
    MarketingPlatformCreate,
    MarketingPlatformResponse,
    MarketingSocialMediaLinkResponse,
    MarketingSocialMediaLinkCreate,
    MarketingHubConfigResponse,
)
from app.services import marketing_hub_service

router = APIRouter(prefix="/api/marketing", tags=["Digital Marketing Hub"])


@router.get("/config", response_model=List[MarketingHubConfigResponse])
def get_marketing_hub_config(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> List[MarketingHubConfigResponse]:
    """Retrieve all active marketing platforms with their tenant-specific URLs."""
    if not current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tenant ID is required to fetch marketing configurations"
        )
    return marketing_hub_service.get_marketing_config(db, tenant_id=current_user.tenant_id)


@router.post("/links", response_model=MarketingSocialMediaLinkResponse)
def save_marketing_link(
    payload: MarketingSocialMediaLinkCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> MarketingSocialMediaLinkResponse:
    """Save or update the URL configuration for a specific marketing platform under this tenant."""
    tenant_id = payload.tenant_id or current_user.tenant_id
    if not tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tenant ID must be specified or resolved from user session"
        )
    return marketing_hub_service.save_marketing_link(
        db=db,
        tenant_id=tenant_id,
        platform_id=payload.platform_id,
        url=payload.url,
        is_active=payload.is_active,
        user_id=current_user.id
    )


@router.get("/platforms", response_model=List[MarketingPlatformResponse])
def list_marketing_platforms(
    active_only: bool = False,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> List[MarketingPlatformResponse]:
    """List all platforms available in the global marketing catalog."""
    return marketing_hub_service.list_platforms(db, active_only=active_only)


@router.post("/platforms", response_model=MarketingPlatformResponse, status_code=status.HTTP_201_CREATED)
def create_marketing_platform(
    payload: MarketingPlatformCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> MarketingPlatformResponse:
    """Create a new platform in the global marketing catalog (Admin/Super Admin only)."""
    return marketing_hub_service.create_platform(
        db=db,
        data=payload,
        user_id=current_user.id
    )
