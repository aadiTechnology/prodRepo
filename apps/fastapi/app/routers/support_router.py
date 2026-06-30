import os

from fastapi import APIRouter, Depends, File, Path, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import CurrentUser
from app.core.exceptions import ValidationException
from app.schemas.support import (
    FaqAttachmentResponse,
    FaqCreateRequest,
    FaqFeedbackRequest,
    FaqFeedbackResponse,
    FaqListResponse,
    FaqResponse,
    FaqUpdateRequest,
    ProductUpdateCreateRequest,
    ProductUpdateListResponse,
    ProductUpdateResponse,
    ProductUpdateUpdateRequest,
)
from app.services import support_service
from app.services.support_access import (
    require_faq_manage,
    require_product_update_manage,
    require_support_view,
    resolve_faq_tenant_filter,
    resolve_faq_write_tenant_id,
)
from app.services.support_attachment_storage import (
    FAQ_ALLOWED_MIME_TYPES,
    FAQ_MAX_FILE_BYTES,
    RELEASE_NOTE_ALLOWED_MIME_TYPES,
    RELEASE_NOTE_MAX_FILE_BYTES,
)

faq_router = APIRouter(prefix="/support/faqs", tags=["Support - FAQs"])
product_update_router = APIRouter(prefix="/support/product-updates", tags=["Support - Product Updates"])


@faq_router.get("", response_model=FaqListResponse)
async def list_faqs(
    page: int = Query(0, ge=0),
    size: int = Query(10, ge=1, le=100),
    search: str | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    category_id: str | None = Query(None),
    module: str | None = Query(None, alias="module"),
    tenant_id: int | None = Query(None, ge=1),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_support_view),
):
    tenant_filter = resolve_faq_tenant_filter(db, current_user, tenant_id)
    return support_service.list_faqs(
        db,
        tenant_id=tenant_filter,
        page=page,
        size=size,
        search=search,
        status=status_filter,
        category_id=category_id,
        module_name=module,
    )


@faq_router.get("/{faq_id}", response_model=FaqResponse)
async def get_faq(
    faq_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_support_view),
):
    tenant_filter = resolve_faq_tenant_filter(db, current_user, None)
    return support_service.get_faq(db, faq_id=faq_id, tenant_id=tenant_filter)


@faq_router.post("", response_model=FaqResponse, status_code=status.HTTP_201_CREATED)
async def create_faq(
    payload: FaqCreateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_faq_manage),
):
    tenant_id = resolve_faq_write_tenant_id(db, current_user, payload.tenant_id)
    return support_service.create_faq(
        db,
        tenant_id=tenant_id,
        user_id=current_user.id,
        payload=payload,
    )


@faq_router.put("/{faq_id}", response_model=FaqResponse)
async def update_faq(
    faq_id: int,
    payload: FaqUpdateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_faq_manage),
):
    tenant_filter = resolve_faq_tenant_filter(db, current_user, None)
    if payload.tenant_id is not None:
        resolve_faq_write_tenant_id(db, current_user, payload.tenant_id)
    return support_service.update_faq(
        db,
        faq_id=faq_id,
        tenant_id=tenant_filter,
        user_id=current_user.id,
        payload=payload,
    )


@faq_router.delete("/{faq_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_faq(
    faq_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_faq_manage),
):
    tenant_filter = resolve_faq_tenant_filter(db, current_user, None)
    support_service.delete_faq(
        db,
        faq_id=faq_id,
        tenant_id=tenant_filter,
        user_id=current_user.id,
    )
    return None


@faq_router.post(
    "/{faq_id}/attachments",
    response_model=FaqAttachmentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_faq_attachment(
    faq_id: int = Path(..., ge=1),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_faq_manage),
):
    content_type = (file.content_type or "").lower()
    if content_type not in FAQ_ALLOWED_MIME_TYPES:
        raise ValidationException("Invalid file format. Allowed: PDF, JPG, PNG")

    content = await file.read()
    if len(content) > FAQ_MAX_FILE_BYTES:
        raise ValidationException("File size exceeded. Maximum allowed size is 3 MB")

    tenant_filter = resolve_faq_tenant_filter(db, current_user, None)
    return support_service.upload_faq_attachment(
        db,
        faq_id=faq_id,
        tenant_id=tenant_filter,
        user_id=current_user.id,
        file_name=file.filename or "attachment",
        content=content,
        content_type=content_type,
    )


@faq_router.get("/{faq_id}/attachments/{attachment_id}/download")
async def download_faq_attachment(
    faq_id: int = Path(..., ge=1),
    attachment_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_support_view),
):
    tenant_filter = resolve_faq_tenant_filter(db, current_user, None)
    disk_path, file_name = support_service.get_faq_attachment_disk_path(
        db,
        faq_id=faq_id,
        attachment_id=attachment_id,
        tenant_id=tenant_filter,
    )
    return FileResponse(disk_path, filename=file_name)


@faq_router.delete(
    "/{faq_id}/attachments/{attachment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_faq_attachment(
    faq_id: int = Path(..., ge=1),
    attachment_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_faq_manage),
):
    tenant_filter = resolve_faq_tenant_filter(db, current_user, None)
    file_path = support_service.delete_faq_attachment(
        db,
        faq_id=faq_id,
        attachment_id=attachment_id,
        tenant_id=tenant_filter,
        user_id=current_user.id,
    )
    if file_path:
        from app.services.support_attachment_storage import disk_path_for_faq_attachment

        disk_path = disk_path_for_faq_attachment(file_path)
        if os.path.exists(disk_path):
            os.remove(disk_path)
    return None


@faq_router.post(
    "/{faq_id}/feedback",
    response_model=FaqFeedbackResponse,
    status_code=status.HTTP_201_CREATED,
)
async def submit_faq_feedback(
    faq_id: int,
    payload: FaqFeedbackRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_support_view),
):
    tenant_filter = resolve_faq_tenant_filter(db, current_user, None)
    return support_service.submit_faq_feedback(
        db,
        faq_id=faq_id,
        tenant_id=tenant_filter,
        user_id=current_user.id,
        payload=payload,
    )


@product_update_router.get("", response_model=ProductUpdateListResponse)
async def list_product_updates(
    page: int = Query(0, ge=0),
    size: int = Query(10, ge=1, le=100),
    search: str | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_support_view),
):
    _ = current_user
    return support_service.list_product_updates(
        db,
        page=page,
        size=size,
        search=search,
        status=status_filter,
    )


@product_update_router.get("/{update_id}", response_model=ProductUpdateResponse)
async def get_product_update(
    update_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_support_view),
):
    _ = current_user
    return support_service.get_product_update(db, update_id)


@product_update_router.post("", response_model=ProductUpdateResponse, status_code=status.HTTP_201_CREATED)
async def create_product_update(
    payload: ProductUpdateCreateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_product_update_manage),
):
    return support_service.create_product_update(
        db,
        user_id=current_user.id,
        payload=payload,
    )


@product_update_router.put("/{update_id}", response_model=ProductUpdateResponse)
async def update_product_update(
    update_id: int,
    payload: ProductUpdateUpdateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_product_update_manage),
):
    return support_service.update_product_update(
        db,
        update_id=update_id,
        user_id=current_user.id,
        payload=payload,
    )


@product_update_router.delete("/{update_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product_update(
    update_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_product_update_manage),
):
    file_path = support_service.delete_product_update(
        db,
        update_id=update_id,
        user_id=current_user.id,
    )
    if file_path:
        from app.services.support_attachment_storage import disk_path_for_release_note

        disk_path = disk_path_for_release_note(file_path)
        if os.path.exists(disk_path):
            os.remove(disk_path)
    return None


@product_update_router.post("/{update_id}/release-note", response_model=ProductUpdateResponse)
async def upload_release_note(
    update_id: int = Path(..., ge=1),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_product_update_manage),
):
    content_type = (file.content_type or "").lower()
    if content_type not in RELEASE_NOTE_ALLOWED_MIME_TYPES:
        raise ValidationException("Invalid file format. Allowed: PDF, DOC, DOCX")

    content = await file.read()
    if len(content) > RELEASE_NOTE_MAX_FILE_BYTES:
        raise ValidationException("File size exceeded. Maximum allowed size is 10 MB")

    return support_service.upload_release_note(
        db,
        update_id=update_id,
        user_id=current_user.id,
        file_name=file.filename or "release-note",
        content=content,
        content_type=content_type,
    )


@product_update_router.get("/{update_id}/release-note/download")
async def download_release_note(
    update_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_support_view),
):
    _ = current_user
    disk_path, file_name = support_service.get_release_note_disk_path(update_id, db)
    return FileResponse(disk_path, filename=file_name)
