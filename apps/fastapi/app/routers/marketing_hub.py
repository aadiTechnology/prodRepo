from __future__ import annotations

from typing import List
from fastapi import APIRouter, Depends, status, HTTPException

from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import CurrentUser, get_current_user
from app.schemas.marketing_hub import (
    MarketingPlatformCreate,
    MarketingPlatformResponse,
    MarketingPlatformUpdate,
    MarketingSocialMediaLinkResponse,
    MarketingSocialMediaLinkCreate,
    MarketingHubConfigResponse,
    NextSortOrderResponse,
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


@router.get("/platforms/next-sort-order", response_model=NextSortOrderResponse)
def get_next_marketing_platform_sort_order(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> NextSortOrderResponse:
    """Next Sort Order for Add Platform (max existing + 1)."""
    return NextSortOrderResponse(next_sort_order=marketing_hub_service.next_sort_order(db))


@router.get("/platforms", response_model=List[MarketingPlatformResponse])
def list_marketing_platforms(
    active_only: bool = False,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> List[MarketingPlatformResponse]:
    """List all platforms available in the global marketing catalog."""
    return marketing_hub_service.list_platforms(db, active_only=active_only)


@router.get("/config/{platform_id}", response_model=MarketingHubConfigResponse)
def get_marketing_platform_config(
    platform_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> MarketingHubConfigResponse:
    """Retrieve a single marketing platform with tenant-specific link configuration."""
    if not current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tenant ID is required to fetch marketing configurations",
        )
    return marketing_hub_service.get_platform_config_for_tenant(
        db=db,
        tenant_id=current_user.tenant_id,
        platform_id=platform_id,
    )


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


@router.put("/platforms/{platform_id}", response_model=MarketingPlatformResponse)
def update_marketing_platform(
    platform_id: int,
    payload: MarketingPlatformUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> MarketingPlatformResponse:
    """Update a platform in the global marketing catalog."""
    return marketing_hub_service.update_platform(
        db=db,
        platform_id=platform_id,
        data=payload,
        user_id=current_user.id,
    )


@router.delete("/links/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_marketing_link(
    link_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> None:
    """Remove a tenant's configured link for a marketing platform."""
    if not current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tenant ID is required to delete marketing links",
        )
    marketing_hub_service.delete_marketing_link(
        db=db,
        tenant_id=current_user.tenant_id,
        link_id=link_id,
    )


@router.delete("/platforms/{platform_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_marketing_platform(
    platform_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> None:
    """Soft-delete a platform from the global marketing catalog."""
    marketing_hub_service.delete_platform(
        db=db,
        platform_id=platform_id,
        user_id=current_user.id,
    )
