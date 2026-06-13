from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, Path, Query, UploadFile, status
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.exceptions import ValidationException
from app.core.dependencies import CurrentUser, get_current_user, require_menu_path_permission
from app.schemas.activity_gallery_schema import (
    ActivityGalleryCreate,
    ActivityGalleryDeleteResponse,
    ActivityGalleryListResponse,
    ActivityGalleryMediaResponse,
    ActivityGalleryPublishResponse,
    ActivityGalleryResponse,
    ActivityGalleryUpdate,
    ActivityGalleryYoutubeCreate,
    ClassOption,
    DivisionOption,
    TeacherGalleryScopeResponse,
)
from app.services import activity_gallery_service
from app.services.activity_gallery_access import (
    ACTIVITY_GALLERY_MENU_PATH,
    user_can_create_gallery,
    user_can_edit_gallery,
    user_can_manage_galleries,
)
from app.services.homework_access import is_admin_like

router = APIRouter(
    prefix="/api/activity-galleries",
    tags=["Activity Management - Photo/Video Gallery"],
    responses={404: {"description": "Not found"}},
)


def _viewer_context(db: Session, current_user: CurrentUser, *, manage: bool = False):
    return activity_gallery_service.get_viewer_context(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        email=str(current_user.email),
        legacy_role=current_user.role,
        manage=manage,
    )


def _require_gallery_create_permission(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> CurrentUser:
    if not user_can_create_gallery(db, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    return current_user


def _require_gallery_edit_permission(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> CurrentUser:
    if not user_can_edit_gallery(db, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    return current_user


def _require_gallery_upload_permission(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> CurrentUser:
    """Allow users with create or edit permission (needed during add-gallery flow)."""
    if not activity_gallery_service.user_can_manage(db, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    return current_user


@router.get("/teacher-classes", response_model=List[ClassOption])
def get_teacher_classes(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_menu_path_permission(ACTIVITY_GALLERY_MENU_PATH, "view")
    ),
):
    return activity_gallery_service.get_classes_for_teacher(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
    )


@router.get("/teacher-scope", response_model=TeacherGalleryScopeResponse)
def get_teacher_gallery_scope(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_menu_path_permission(ACTIVITY_GALLERY_MENU_PATH, "view")
    ),
):
    return activity_gallery_service.get_teacher_gallery_scope(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
    )


@router.get("/divisions", response_model=List[DivisionOption])
def get_divisions_for_class(
    class_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_menu_path_permission(ACTIVITY_GALLERY_MENU_PATH, "view")
    ),
):
    return activity_gallery_service.get_divisions_for_class(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        class_id=class_id,
    )


@router.get("", response_model=ActivityGalleryListResponse)
def list_activity_galleries(
    page: int = Query(0, ge=0),
    size: int = Query(10, ge=1, le=100),
    search: str | None = Query(None),
    gallery_type: str | None = Query(None, description="Photo or Video"),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    can_manage = activity_gallery_service.user_can_manage(db, current_user)
    is_admin = is_admin_like(
        db, current_user.id, current_user.role, current_user.tenant_id
    )
    viewer_context = _viewer_context(db, current_user, manage=can_manage and is_admin)
    return activity_gallery_service.list_galleries(
        db,
        tenant_id=current_user.tenant_id,
        gallery_type=gallery_type,
        search=search,
        page=page,
        size=size,
        viewer_context=viewer_context,
    )


@router.get("/{gallery_id}", response_model=ActivityGalleryResponse)
def get_activity_gallery(
    gallery_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    can_manage = activity_gallery_service.user_can_manage(db, current_user)
    is_admin = is_admin_like(
        db, current_user.id, current_user.role, current_user.tenant_id
    )
    viewer_context = _viewer_context(db, current_user, manage=can_manage and is_admin)
    return activity_gallery_service.get_gallery(
        db,
        tenant_id=current_user.tenant_id,
        gallery_id=gallery_id,
        viewer_context=viewer_context,
    )


@router.post("", response_model=ActivityGalleryResponse, status_code=status.HTTP_201_CREATED)
def create_activity_gallery(
    payload: ActivityGalleryCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(_require_gallery_create_permission),
):
    return activity_gallery_service.create_gallery(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        legacy_role=current_user.role,
        payload=payload,
    )


@router.put("/{gallery_id}", response_model=ActivityGalleryResponse)
def update_activity_gallery(
    payload: ActivityGalleryUpdate,
    gallery_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(_require_gallery_edit_permission),
):
    return activity_gallery_service.update_gallery(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        legacy_role=current_user.role,
        gallery_id=gallery_id,
        payload=payload,
    )


@router.delete("/{gallery_id}", response_model=ActivityGalleryDeleteResponse)
def delete_activity_gallery(
    gallery_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_menu_path_permission(ACTIVITY_GALLERY_MENU_PATH, "delete")
    ),
):
    return activity_gallery_service.delete_gallery(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        legacy_role=current_user.role,
        gallery_id=gallery_id,
    )


@router.post("/{gallery_id}/publish", response_model=ActivityGalleryPublishResponse)
def publish_activity_gallery(
    gallery_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(_require_gallery_edit_permission),
):
    return activity_gallery_service.publish_gallery(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        legacy_role=current_user.role,
        gallery_id=gallery_id,
    )


@router.post(
    "/{gallery_id}/media",
    response_model=ActivityGalleryMediaResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_gallery_media(
    gallery_id: int = Path(..., ge=1),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(_require_gallery_upload_permission),
):
    content = await file.read()
    if not content:
        raise ValidationException("Please upload at least one file")
    return activity_gallery_service.upload_media(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        legacy_role=current_user.role,
        gallery_id=gallery_id,
        filename=file.filename or "upload",
        content=content,
        content_type=file.content_type,
    )


@router.post(
    "/{gallery_id}/youtube-videos",
    response_model=ActivityGalleryMediaResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_gallery_youtube_video(
    payload: ActivityGalleryYoutubeCreate,
    gallery_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(_require_gallery_upload_permission),
):
    return activity_gallery_service.add_youtube_video(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        legacy_role=current_user.role,
        gallery_id=gallery_id,
        youtube_url=payload.youtube_url,
    )


@router.post(
    "/{gallery_id}/media/bulk",
    response_model=List[ActivityGalleryMediaResponse],
    status_code=status.HTTP_201_CREATED,
)
async def upload_gallery_media_bulk(
    gallery_id: int = Path(..., ge=1),
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(_require_gallery_upload_permission),
):
    payloads: list[tuple[str, bytes, str | None]] = []
    for upload in files:
        content = await upload.read()
        if not content:
            continue
        payloads.append((upload.filename or "upload", content, upload.content_type))
    if not payloads:
        raise ValidationException("Please upload at least one file")
    return activity_gallery_service.upload_media_bulk(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        legacy_role=current_user.role,
        gallery_id=gallery_id,
        files=payloads,
    )


@router.delete(
    "/{gallery_id}/media/{media_id}",
    response_model=ActivityGalleryDeleteResponse,
)
def delete_gallery_media(
    gallery_id: int = Path(..., ge=1),
    media_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(_require_gallery_upload_permission),
):
    return activity_gallery_service.delete_media(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        legacy_role=current_user.role,
        gallery_id=gallery_id,
        media_id=media_id,
    )


@router.get("/{gallery_id}/media/{media_id}/content")
def get_gallery_media_content(
    gallery_id: int = Path(..., ge=1),
    media_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    can_manage = activity_gallery_service.user_can_manage(db, current_user)
    is_admin = is_admin_like(
        db, current_user.id, current_user.role, current_user.tenant_id
    )
    viewer_context = _viewer_context(db, current_user, manage=can_manage and is_admin)
    content, mime, _ = activity_gallery_service.get_media_content(
        db,
        tenant_id=current_user.tenant_id,
        gallery_id=gallery_id,
        media_id=media_id,
        viewer_context=viewer_context,
    )
    return Response(content=content, media_type=mime)


@router.get("/{gallery_id}/media/{media_id}/download")
def download_gallery_media(
    gallery_id: int = Path(..., ge=1),
    media_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    can_manage = activity_gallery_service.user_can_manage(db, current_user)
    is_admin = is_admin_like(
        db, current_user.id, current_user.role, current_user.tenant_id
    )
    viewer_context = _viewer_context(db, current_user, manage=can_manage and is_admin)
    content, disk_path, mime, download_name = activity_gallery_service.get_media_for_download(
        db,
        tenant_id=current_user.tenant_id,
        gallery_id=gallery_id,
        media_id=media_id,
        viewer_context=viewer_context,
    )
    if content is not None:
        return Response(
            content=content,
            media_type=mime,
            headers={"Content-Disposition": f'attachment; filename="{download_name}"'},
        )
    return FileResponse(
        path=disk_path,
        filename=download_name,
        media_type=mime,
    )
