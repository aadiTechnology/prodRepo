"""
Syllabus Management API.

Endpoints for tenant-scoped class syllabus records with a single cloud storage attachment.
Authorization uses menu path `/academics/syllabus` (ACADEMIC_MGMT) via require_menu_path_permission.
Teacher / student / parent list and detail access is class-scoped via homework viewer context.
"""

from __future__ import annotations

import os

from fastapi import APIRouter, Depends, File, Path, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import (
    CurrentUser,
    _enforce_menu_permission,
    get_current_user,
    require_menu_path_permission,
)
from app.core.exceptions import ForbiddenException, ValidationException
from app.schemas.syllabus_schema import (
    SyllabusAttachmentResponse,
    SyllabusCreateRequest,
    SyllabusFilterOptionsResponse,
    SyllabusListResponse,
    SyllabusResponse,
    SyllabusUpdateRequest,
)
from app.services import syllabus_service
from app.services.syllabus_attachment_storage import ALLOWED_EXTENSIONS, MAX_FILE_SIZE_MB
from app.services.syllabus_service import SYLLABUS_MENU_PATH

router = APIRouter(
    prefix="/api/academics/syllabus",
    tags=["Academics - Syllabus"],
    responses={404: {"description": "Not found"}},
)


def _viewer(db: Session, current_user: CurrentUser):
    return syllabus_service.get_viewer_context(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        email=str(current_user.email),
        legacy_role=current_user.role,
    )


def _require_syllabus_upload_permission(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> CurrentUser:
    """Allow upload when the user has create or edit (same rules as create/edit endpoints)."""
    try:
        return _enforce_menu_permission(
            db, current_user, "create", menu_path=SYLLABUS_MENU_PATH
        )
    except ForbiddenException:
        return _enforce_menu_permission(
            db, current_user, "edit", menu_path=SYLLABUS_MENU_PATH
        )


@router.get(
    "/filter-options",
    response_model=SyllabusFilterOptionsResponse,
    summary="Syllabus filter dropdown options",
)
def get_filter_options(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_menu_path_permission(SYLLABUS_MENU_PATH, "view")
    ),
):
    """Academic years, classes (role-scoped), and month labels for list/form filters."""
    return syllabus_service.get_filter_options(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        viewer_context=_viewer(db, current_user),
    )


@router.get(
    "",
    response_model=SyllabusListResponse,
    summary="List syllabus records",
)
def list_syllabus(
    page: int = Query(0, ge=0),
    size: int = Query(10, ge=1, le=100),
    search: str | None = Query(None),
    academic_year_id: int | None = Query(None, ge=1),
    class_id: int | None = Query(None, ge=1),
    month: str | None = Query(None, description="Calendar month name, e.g. April"),
    scoped_class_id: int | None = Query(
        None, ge=1, description="Optional teacher/student class scope override"
    ),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_menu_path_permission(SYLLABUS_MENU_PATH, "view")
    ),
):
    """Paginated syllabus list for the current tenant, filtered and class-scoped by role."""
    return syllabus_service.list_syllabus(
        db,
        tenant_id=current_user.tenant_id,
        page=page,
        size=size,
        search=search,
        academic_year_id=academic_year_id,
        class_id=class_id,
        month=month,
        scoped_class_id=scoped_class_id,
        viewer_context=_viewer(db, current_user),
    )


@router.get(
    "/{syllabus_id}",
    response_model=SyllabusResponse,
    summary="Get syllabus by id",
)
def get_syllabus(
    syllabus_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_menu_path_permission(SYLLABUS_MENU_PATH, "view")
    ),
):
    return syllabus_service.get_syllabus(
        db,
        tenant_id=current_user.tenant_id,
        syllabus_id=syllabus_id,
        viewer_context=_viewer(db, current_user),
    )


@router.post(
    "",
    response_model=SyllabusResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create syllabus",
)
def create_syllabus(
    payload: SyllabusCreateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_menu_path_permission(SYLLABUS_MENU_PATH, "create")
    ),
):
    """Create syllabus metadata. Upload the attachment via POST /{id}/attachments."""
    return syllabus_service.create_syllabus(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        payload=payload,
        viewer_context=_viewer(db, current_user),
    )


@router.put(
    "/{syllabus_id}",
    response_model=SyllabusResponse,
    summary="Update syllabus",
)
def update_syllabus(
    payload: SyllabusUpdateRequest,
    syllabus_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_menu_path_permission(SYLLABUS_MENU_PATH, "edit")
    ),
):
    return syllabus_service.update_syllabus(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        syllabus_id=syllabus_id,
        payload=payload,
        viewer_context=_viewer(db, current_user),
    )


@router.delete(
    "/{syllabus_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete syllabus (soft)",
)
def delete_syllabus(
    syllabus_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_menu_path_permission(SYLLABUS_MENU_PATH, "delete")
    ),
):
    syllabus_service.delete_syllabus(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        syllabus_id=syllabus_id,
        viewer_context=_viewer(db, current_user),
    )
    return None


@router.post(
    "/{syllabus_id}/attachments",
    response_model=SyllabusAttachmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload or replace syllabus attachment",
)
async def upload_syllabus_attachment(
    syllabus_id: int = Path(..., ge=1),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(_require_syllabus_upload_permission),
):
    """
    Upload a single attachment for the syllabus (replaces any existing file).
    Allowed: pdf, doc, docx, xls, xlsx, ppt, pptx, jpg, jpeg, png. Max 10 MB.
    """
    extension = os.path.splitext(file.filename or "")[1].lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise ValidationException(
            "Invalid file type. Allowed: pdf, doc, docx, xls, xlsx, ppt, pptx, jpg, jpeg, png"
        )

    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise ValidationException(
            f"File size exceeded. Maximum allowed size is {MAX_FILE_SIZE_MB} MB"
        )

    return syllabus_service.upload_attachment(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        syllabus_id=syllabus_id,
        file_name=file.filename or f"attachment{extension}",
        content=content,
        content_type=file.content_type,
        viewer_context=_viewer(db, current_user),
    )


@router.delete(
    "/{syllabus_id}/attachments/{attachment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete syllabus attachment (soft)",
)
def delete_syllabus_attachment(
    syllabus_id: int = Path(..., ge=1),
    attachment_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_menu_path_permission(SYLLABUS_MENU_PATH, "edit")
    ),
):
    syllabus_service.delete_attachment(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        syllabus_id=syllabus_id,
        attachment_id=attachment_id,
        viewer_context=_viewer(db, current_user),
    )
    return None
