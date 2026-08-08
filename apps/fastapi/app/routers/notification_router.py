"""HTTP endpoints for in-app notifications and module settings."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Path, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.schemas.auth import CurrentUser
from app.schemas.notification_schema import (
    DeviceRegisterRequest,
    DeviceRegisterResponse,
    NotificationCountResponse,
    NotificationCreateRequest,
    NotificationCreateResponse,
    NotificationListResponse,
    NotificationMarkReadResponse,
    NotificationSettingsResponse,
    NotificationSettingsUpdateRequest,
)
from app.services import notification_service

router = APIRouter(
    prefix="/api/notifications",
    tags=["Notifications"],
    responses={404: {"description": "Not found"}},
)


@router.post(
    "",
    response_model=NotificationCreateResponse,
    status_code=status.HTTP_201_CREATED,
    response_model_by_alias=True,
)
@router.post(
    "/",
    response_model=NotificationCreateResponse,
    status_code=status.HTTP_201_CREATED,
    response_model_by_alias=True,
    include_in_schema=False,
)
def create_notification(
    payload: NotificationCreateRequest,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    """
    Standard Notification Create API (From, To, Subject, Body only).

    Any module may call this after a successful Save. Payload is stored in
    `notifications`; inbox fan-out is handled by the notification service.
    """
    return notification_service.create_notification_from_request(
        db,
        tenant_id=current_user.tenant_id,
        payload=payload,
        created_by=current_user.id,
    )


@router.post(
    "/devices",
    response_model=DeviceRegisterResponse,
    status_code=status.HTTP_200_OK,
)
def register_device(
    payload: DeviceRegisterRequest,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    """Register or refresh the authenticated user's FCM device token."""
    return notification_service.register_device_token(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        payload=payload,
    )


@router.get("", response_model=NotificationListResponse)
@router.get("/", response_model=NotificationListResponse)
def list_notifications(
    page: int = Query(0, ge=0),
    size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """List inbox notifications for the current user (settings modules applied)."""
    return notification_service.list_notifications(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        page=page,
        size=size,
        email=str(current_user.email or ""),
        legacy_role=current_user.role,
    )


@router.get("/unread-count", response_model=NotificationCountResponse)
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Unread badge count respecting module settings and class scope."""
    return notification_service.get_unread_count(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        email=str(current_user.email or ""),
        legacy_role=current_user.role,
    )


@router.get("/settings", response_model=NotificationSettingsResponse)
def get_settings(
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    """Return per-module notification toggles (defaults all enabled)."""
    return notification_service.get_settings(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
    )


@router.put("/settings", response_model=NotificationSettingsResponse)
def update_settings(
    payload: NotificationSettingsUpdateRequest,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    """Update module toggles; changes apply immediately to list and unread count."""
    return notification_service.update_settings(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        payload=payload,
    )


@router.post("/{notification_id}/mark-read", response_model=NotificationMarkReadResponse)
def mark_notification_read(
    notification_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    """Mark a single inbox notification as read for the current user."""
    return notification_service.mark_as_read(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        notification_id=notification_id,
    )
