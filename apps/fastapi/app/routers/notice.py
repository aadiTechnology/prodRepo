from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import CurrentUser, require_permission
from app.schemas.notice import (
    NoticeCreateRequest,
    NoticeDropdownOptionsResponse,
    NoticeListResponse,
    NoticeResponse,
    NoticeStatusUpdateResponse,
    NoticeUpdateRequest,
)
from app.services import notice_service

router = APIRouter(prefix="/communications/notices", tags=["Communication - Notices"])


@router.get("", response_model=NoticeListResponse)
async def list_notices(
    page: int = Query(0, ge=0),
    size: int = Query(10, ge=1, le=100),
    search: str | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    audience_type: str | None = Query(None),
    notice_type: str | None = Query(None),
    is_published: bool | None = Query(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Create Notices", "view")),
):
    can_manage = notice_service.user_can_manage_notices(db, current_user)
    viewer_context = notice_service.get_viewer_context(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        email=str(current_user.email),
        legacy_role=current_user.role,
        manage=can_manage,
    )
    return notice_service.list_notices(
        db,
        tenant_id=current_user.tenant_id,
        page=page,
        size=size,
        search=search,
        status=status_filter.upper() if status_filter else None,
        audience_type=audience_type.upper() if audience_type else None,
        notice_type=notice_type.upper() if notice_type else None,
        is_published=is_published,
        viewer_context=viewer_context,
    )


@router.get("/dropdown/options", response_model=NoticeDropdownOptionsResponse)
async def get_notice_dropdown_options(
    current_user: CurrentUser = Depends(require_permission("Create Notices", "view")),
):
    _ = current_user
    return notice_service.get_dropdown_options()


@router.get("/{notice_id}", response_model=NoticeResponse)
async def get_notice(
    notice_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Create Notices", "view")),
):
    can_manage = notice_service.user_can_manage_notices(db, current_user)
    viewer_context = notice_service.get_viewer_context(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        email=str(current_user.email),
        legacy_role=current_user.role,
        manage=can_manage,
    )
    return notice_service.get_notice(
        db,
        tenant_id=current_user.tenant_id,
        notice_id=notice_id,
        viewer_context=viewer_context,
    )


@router.post("", response_model=NoticeResponse, status_code=status.HTTP_201_CREATED)
async def create_notice(
    payload: NoticeCreateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Create Notices", "create")),
):
    return notice_service.create_notice(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        payload=payload,
    )


@router.put("/{notice_id}", response_model=NoticeResponse)
async def update_notice(
    notice_id: int,
    payload: NoticeUpdateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Create Notices", "edit")),
):
    return notice_service.update_notice(
        db,
        tenant_id=current_user.tenant_id,
        notice_id=notice_id,
        user_id=current_user.id,
        payload=payload,
    )


@router.post("/{notice_id}/publish", response_model=NoticeStatusUpdateResponse)
async def publish_notice(
    notice_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Create Notices", "edit")),
):
    return notice_service.publish_notice(
        db,
        tenant_id=current_user.tenant_id,
        notice_id=notice_id,
        user_id=current_user.id,
    )


@router.post("/{notice_id}/unpublish", response_model=NoticeStatusUpdateResponse)
async def unpublish_notice(
    notice_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Create Notices", "edit")),
):
    return notice_service.unpublish_notice(
        db,
        tenant_id=current_user.tenant_id,
        notice_id=notice_id,
        user_id=current_user.id,
    )


@router.delete("/{notice_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notice(
    notice_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Create Notices", "delete")),
):
    notice_service.delete_notice(
        db,
        tenant_id=current_user.tenant_id,
        notice_id=notice_id,
        user_id=current_user.id,
    )
    return None
