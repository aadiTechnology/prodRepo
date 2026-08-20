"""
Support module API — My Queries and Release Notes.

Queries are tenant-scoped with role-based visibility.
Release notes are global and filtered by Show To role flags.
"""

from __future__ import annotations

import os

from fastapi import APIRouter, Depends, File, Path, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import CurrentUser
from app.core.exceptions import ValidationException
from app.schemas.support_schema import (
    ReleaseNoteCreateRequest,
    ReleaseNoteListResponse,
    ReleaseNoteResponse,
    ReleaseNoteUpdateRequest,
    SupportQueryCreateRequest,
    SupportQueryListResponse,
    SupportQueryMessageCreateRequest,
    SupportQueryMessageUpdateRequest,
    SupportQueryResponse,
    SupportQueryUpdateRequest,
    SupportMarkViewedResponse,
    SupportUnreadCountResponse,
)
from app.services import support_service
from app.services.support_access import (
    require_query_access,
    require_release_note_manage,
    require_support_view,
)
from app.services.support_attachment_storage import (
    QUERY_ALLOWED_EXTENSIONS,
    QUERY_MAX_FILE_BYTES,
    RELEASE_NOTE_ALLOWED_EXTENSIONS,
    RELEASE_NOTE_MAX_FILE_BYTES,
)

router = APIRouter(
    prefix="/api/support",
    tags=["Support"],
    responses={404: {"description": "Not found"}},
)


def _validate_upload_extension(
    file_name: str,
    allowed: set[str],
    *,
    invalid_message: str | None = None,
) -> None:
    ext = os.path.splitext(file_name or "")[1].lower()
    if ext not in allowed:
        raise ValidationException(
            invalid_message
            or f"Invalid file type. Allowed: {', '.join(ext.lstrip('.') for ext in sorted(allowed))}"
        )


@router.get(
    "/queries",
    response_model=SupportQueryListResponse,
    summary="List support queries visible to the current user",
)
async def list_queries(
    page: int = Query(0, ge=0),
    size: int = Query(50, ge=1, le=100),
    search: str | None = Query(None),
    category: str | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_query_access),
):
    return support_service.list_queries(
        db,
        current_user=current_user,
        page=page,
        size=size,
        search=search,
        category=category,
        status=status_filter,
    )


@router.get(
    "/queries/unread-count",
    response_model=SupportUnreadCountResponse,
    summary="Unread support query activity count for sidebar badge",
)
async def get_query_unread_count(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_query_access),
):
    return SupportUnreadCountResponse(
        count=support_service.count_unread_queries(db, current_user=current_user)
    )


@router.get(
    "/queries/{query_key}",
    response_model=SupportQueryResponse,
    summary="Get a support query by reference (e.g. QRY-001)",
)
async def get_query(
    query_key: str = Path(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_query_access),
):
    return support_service.get_query(db, current_user=current_user, query_key=query_key)


@router.post(
    "/queries/{query_key}/mark-viewed",
    response_model=SupportMarkViewedResponse,
    summary="Mark support query activity as read (sidebar badge -1)",
)
async def mark_query_viewed(
    query_key: str = Path(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_query_access),
):
    return support_service.mark_query_viewed(
        db,
        current_user=current_user,
        query_key=query_key,
    )


@router.post(
    "/queries",
    response_model=SupportQueryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a support query",
)
async def create_query(
    payload: SupportQueryCreateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_query_access),
):
    return support_service.create_query(db, current_user=current_user, payload=payload)


@router.put(
    "/queries/{query_key}",
    response_model=SupportQueryResponse,
    summary="Update a support query",
)
async def update_query(
    query_key: str,
    payload: SupportQueryUpdateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_query_access),
):
    return support_service.update_query(
        db,
        current_user=current_user,
        query_key=query_key,
        payload=payload,
    )


@router.delete(
    "/queries/{query_key}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Soft-delete a support query (owner only)",
)
async def delete_query(
    query_key: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_query_access),
):
    support_service.delete_query(db, current_user=current_user, query_key=query_key)
    return None


@router.post(
    "/queries/{query_key}/messages",
    response_model=SupportQueryResponse,
    summary="Add a conversation message to a query",
)
async def add_query_message(
    query_key: str,
    payload: SupportQueryMessageCreateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_query_access),
):
    return support_service.add_query_message(
        db,
        current_user=current_user,
        query_key=query_key,
        payload=payload,
    )


@router.put(
    "/queries/{query_key}/messages/{message_id}",
    response_model=SupportQueryResponse,
    summary="Update a conversation message (author only)",
)
async def update_query_message(
    payload: SupportQueryMessageUpdateRequest,
    query_key: str,
    message_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_query_access),
):
    return support_service.update_query_message(
        db,
        current_user=current_user,
        query_key=query_key,
        message_id=message_id,
        payload=payload,
    )


@router.delete(
    "/queries/{query_key}/messages/{message_id}",
    response_model=SupportQueryResponse,
    summary="Delete a conversation message (author only)",
)
async def delete_query_message(
    query_key: str,
    message_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_query_access),
):
    return support_service.delete_query_message(
        db,
        current_user=current_user,
        query_key=query_key,
        message_id=message_id,
    )


@router.post(
    "/queries/{query_key}/forward",
    response_model=SupportQueryResponse,
    summary="Forward a student query to Super Admin",
)
async def forward_query(
    query_key: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_query_access),
):
    return support_service.forward_query(db, current_user=current_user, query_key=query_key)


@router.post(
    "/queries/{query_key}/attachment",
    response_model=SupportQueryResponse,
    summary="Upload query attachment",
)
async def upload_query_attachment(
    query_key: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_query_access),
):
    content = await file.read()
    if len(content) > QUERY_MAX_FILE_BYTES:
        raise ValidationException("File size exceeded. Maximum allowed size is 10 MB")
    _validate_upload_extension(
        file.filename or "",
        QUERY_ALLOWED_EXTENSIONS,
        invalid_message=(
            "Please upload a valid file. Allowed file types: PDF, DOC, DOCX, JPG, JPEG, PNG."
        ),
    )

    return support_service.upload_query_attachment(
        db,
        current_user=current_user,
        query_key=query_key,
        file_name=file.filename or "attachment",
        content=content,
        content_type=file.content_type,
    )


@router.get(
    "/release-notes",
    response_model=ReleaseNoteListResponse,
    summary="List release notes visible to the current user",
)
async def list_release_notes(
    page: int = Query(0, ge=0),
    size: int = Query(50, ge=1, le=100),
    search: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_support_view),
):
    return support_service.list_release_notes(
        db,
        current_user=current_user,
        page=page,
        size=size,
        search=search,
    )


@router.get(
    "/release-notes/{note_id}",
    response_model=ReleaseNoteResponse,
    summary="Get a release note by id",
)
async def get_release_note(
    note_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_support_view),
):
    return support_service.get_release_note(db, current_user=current_user, note_id=note_id)


@router.post(
    "/release-notes",
    response_model=ReleaseNoteResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a release note (Super Admin only)",
)
async def create_release_note(
    payload: ReleaseNoteCreateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_release_note_manage),
):
    return support_service.create_release_note(db, current_user=current_user, payload=payload)


@router.put(
    "/release-notes/{note_id}",
    response_model=ReleaseNoteResponse,
    summary="Update a release note (Super Admin only)",
)
async def update_release_note(
    note_id: int,
    payload: ReleaseNoteUpdateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_release_note_manage),
):
    return support_service.update_release_note(
        db,
        current_user=current_user,
        note_id=note_id,
        payload=payload,
    )


@router.delete(
    "/release-notes/{note_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Soft-delete a release note (Super Admin only)",
)
async def delete_release_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_release_note_manage),
):
    support_service.delete_release_note(db, current_user=current_user, note_id=note_id)
    return None


@router.post(
    "/release-notes/{note_id}/attachment",
    response_model=ReleaseNoteResponse,
    summary="Upload release note attachment",
)
async def upload_release_note_attachment(
    note_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_release_note_manage),
):
    content = await file.read()
    if len(content) > RELEASE_NOTE_MAX_FILE_BYTES:
        raise ValidationException("File size exceeded. Maximum allowed size is 10 MB")
    _validate_upload_extension(file.filename or "", RELEASE_NOTE_ALLOWED_EXTENSIONS)

    return support_service.upload_release_note_attachment(
        db,
        current_user=current_user,
        note_id=note_id,
        file_name=file.filename or "attachment",
        content=content,
        content_type=file.content_type,
    )
