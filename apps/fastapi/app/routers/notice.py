import os

from fastapi import APIRouter, Depends, File, HTTPException, Path, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import CurrentUser, get_current_user, require_menu_path_permission
from app.core.exceptions import ValidationException
from app.services.notice_attachment_storage import ALLOWED_MIME_TYPES, MAX_FILE_BYTES, disk_path_for_attachment
from app.services.notice_service import NOTICE_MENU_PATH
from app.schemas.notice import (
    NoticeAttachmentResponse,
    NoticeCreateRequest,
    NoticeDropdownOptionsResponse,
    NoticeListResponse,
    NoticeResponse,
    NoticeStatusUpdateResponse,
    NoticeUpdateRequest,
)
from app.services import notice_service

router = APIRouter(prefix="/communications/notices", tags=["Communication - Notices"])


def _require_notice_manage_permission(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> CurrentUser:
    if not notice_service.user_can_manage_notices(db, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    return current_user


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
    current_user: CurrentUser = Depends(require_menu_path_permission(NOTICE_MENU_PATH, "view")),
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
    current_user: CurrentUser = Depends(require_menu_path_permission(NOTICE_MENU_PATH, "view")),
):
    _ = current_user
    return notice_service.get_dropdown_options()


@router.get("/{notice_id}", response_model=NoticeResponse)
async def get_notice(
    notice_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_menu_path_permission(NOTICE_MENU_PATH, "view")),
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
    current_user: CurrentUser = Depends(require_menu_path_permission(NOTICE_MENU_PATH, "create")),
):
    return notice_service.create_notice(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        legacy_role=current_user.role,
        payload=payload,
    )


@router.put("/{notice_id}", response_model=NoticeResponse)
async def update_notice(
    notice_id: int,
    payload: NoticeUpdateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_menu_path_permission(NOTICE_MENU_PATH, "edit")),
):
    return notice_service.update_notice(
        db,
        tenant_id=current_user.tenant_id,
        notice_id=notice_id,
        user_id=current_user.id,
        legacy_role=current_user.role,
        payload=payload,
    )


@router.post("/{notice_id}/publish", response_model=NoticeStatusUpdateResponse)
async def publish_notice(
    notice_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_menu_path_permission(NOTICE_MENU_PATH, "edit")),
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
    current_user: CurrentUser = Depends(require_menu_path_permission(NOTICE_MENU_PATH, "edit")),
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
    current_user: CurrentUser = Depends(require_menu_path_permission(NOTICE_MENU_PATH, "delete")),
):
    notice_service.delete_notice(
        db,
        tenant_id=current_user.tenant_id,
        notice_id=notice_id,
        user_id=current_user.id,
    )
    return None


@router.post(
    "/{notice_id}/attachments",
    response_model=NoticeAttachmentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_notice_attachment(
    notice_id: int = Path(..., ge=1),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(_require_notice_manage_permission),
):
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_MIME_TYPES:
        raise ValidationException("Invalid file format. Allowed: PDF, JPG, PNG")

    content = await file.read()
    if len(content) > MAX_FILE_BYTES:
        raise ValidationException("File size exceeded. Maximum allowed size is 3 MB")

    return notice_service.upload_notice_attachment(
        db,
        tenant_id=current_user.tenant_id,
        notice_id=notice_id,
        user_id=current_user.id,
        file_name=file.filename or "attachment",
        content=content,
        content_type=content_type,
    )


@router.delete(
    "/{notice_id}/attachments/{attachment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_notice_attachment(
    notice_id: int = Path(..., ge=1),
    attachment_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(_require_notice_manage_permission),
):
    file_path = notice_service.delete_notice_attachment(
        db,
        tenant_id=current_user.tenant_id,
        notice_id=notice_id,
        attachment_id=attachment_id,
        user_id=current_user.id,
    )
    if file_path:
        disk_path = disk_path_for_attachment(file_path)
        if os.path.exists(disk_path):
            os.remove(disk_path)
    return None
