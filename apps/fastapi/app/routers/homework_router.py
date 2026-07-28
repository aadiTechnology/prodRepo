from __future__ import annotations

import math
import os
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Path, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.exceptions import ValidationException
from app.schemas.homework_schema import (
    ClassOption,
    DivisionOption,
    HomeworkAttachmentResponse,
    HomeworkCreate,
    HomeworkListResponse,
    HomeworkMarkViewedResponse,
    HomeworkResponse,
    HomeworkUnreadCountResponse,
    HomeworkUpdate,
    SubjectOption,
)
from app.services import homework_service
from app.services.homework_attachment_storage import (
    ALLOWED_EXTENSIONS,
    MAX_FILE_SIZE_MB,
    save_homework_attachment_file,
)

router = APIRouter(
    prefix="/api/homework",
    tags=["Homework"],
    responses={404: {"description": "Not found"}},
)

# ---------------------------------------------------------------------------
# Dropdown — classes available to the current user (teacher-scoped or all)
# ---------------------------------------------------------------------------

@router.get("/teacher-classes", response_model=List[ClassOption])
def get_teacher_classes(
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    """
    Return the classes the current user can assign homework to.
    Teachers get only their assigned classes; admins get all active classes.
    """
    return homework_service.get_classes_for_teacher(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
    )


# ---------------------------------------------------------------------------
# Dropdown — divisions for a class (scoped to teacher's assignments)
# ---------------------------------------------------------------------------

@router.get("/divisions", response_model=List[DivisionOption])
def get_divisions_for_class(
    class_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    """
    Return divisions for a class.
    Teachers only see the divisions they are assigned to; admins see all.
    """
    rows = homework_service.get_divisions_for_teacher_class(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        class_id=class_id,
    )
    return [DivisionOption(id=r["id"], division_name=r["division_name"]) for r in rows]


# ---------------------------------------------------------------------------
# Dropdown — subjects for the logged-in teacher in a class
# ---------------------------------------------------------------------------

@router.get("/subjects", response_model=List[SubjectOption])
def get_teacher_subjects(
    class_id: int = Query(..., ge=1),
    academic_year_id: Optional[int] = Query(None, ge=1),
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    """Return subjects assigned to the current teacher for the given class."""
    return homework_service.get_subjects_for_teacher_class(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        class_id=class_id,
        academic_year_id=academic_year_id,
    )


# ---------------------------------------------------------------------------
# Unread badge (WhatsApp-style: open details -> count decreases)
# ---------------------------------------------------------------------------

@router.get("/unread-count", response_model=HomeworkUnreadCountResponse)
def get_unread_count(
    class_id: Optional[int] = Query(None, ge=1),
    class_division_id: Optional[int] = Query(None, ge=1),
    subject_id: Optional[int] = Query(None, ge=1),
    academic_year_id: Optional[int] = Query(None, ge=1),
    status: Optional[str] = Query(None, description="Draft | Active; omit for both (admin/teacher)"),
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    """
    Homework in the caller's role/class scope that they have not opened yet.

    Scope (from viewer_context):
      - tenant admin / admin: all homework in tenant
      - class teacher: all subjects for assigned class/division
      - subject teacher: only assigned subjects
      - student / parent: their class/division only

    When academic_year_id is omitted, defaults to the tenant's current academic year
    so the sidebar badge is correct immediately on login (no need to open Homework list).
    Optional class/division/subject/status filters further narrow the badge.
    Status: Draft, Active/Published, or omit (both for admin/teacher; published for student/parent).
    """
    viewer_context = homework_service.get_viewer_context(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        email=str(current_user.email),
        legacy_role=current_user.role,
    )
    count = homework_service.count_unread_homework(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        viewer_context=viewer_context,
        class_id=class_id,
        class_division_id=class_division_id,
        subject_id=subject_id,
        academic_year_id=academic_year_id,
        hw_status=status,
    )
    return HomeworkUnreadCountResponse(count=count)


@router.post(
    "/{homework_id}/mark-viewed",
    response_model=HomeworkMarkViewedResponse,
)
def mark_homework_viewed(
    homework_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    """Record that the current user opened this homework (sidebar badge -1)."""
    viewer_context = homework_service.get_viewer_context(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        email=str(current_user.email),
        legacy_role=current_user.role,
    )
    already_viewed, hw_id = homework_service.mark_homework_viewed(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        homework_id=homework_id,
        viewer_context=viewer_context,
    )
    return HomeworkMarkViewedResponse(
        message="Homework marked as viewed",
        homework_id=hw_id,
        already_viewed=already_viewed,
    )


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

@router.get("", response_model=HomeworkListResponse)
def list_homework(
    skip: int = Query(0, ge=0),
    limit: int = Query(25, ge=1, le=200),
    search: Optional[str] = Query(None),
    class_id: Optional[int] = Query(None, ge=1),
    class_division_id: Optional[int] = Query(None, ge=1),
    subject_id: Optional[int] = Query(None, ge=1),
    academic_year_id: Optional[int] = Query(None, ge=1),
    hw_status: Optional[str] = Query(None, alias="status"),
    teacher_id: Optional[int] = Query(None, ge=1),
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    viewer_context = homework_service.get_viewer_context(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        email=str(current_user.email),
        legacy_role=current_user.role,
    )

    # Teachers/students/parents are scoped by assigned class+division on the server.
    # Admins may optionally filter by teacher_id from the query string.
    effective_teacher_id = teacher_id
    if viewer_context.kind in ("teacher", "student", "parent"):
        effective_teacher_id = None

    items, total = homework_service.list_homework(
        db,
        tenant_id=current_user.tenant_id,
        teacher_id=effective_teacher_id,
        class_id=class_id,
        class_division_id=class_division_id,
        subject_id=subject_id,
        academic_year_id=academic_year_id,
        hw_status=hw_status,
        search=search,
        skip=skip,
        limit=limit,
        viewer_context=viewer_context,
    )
    pages = math.ceil(total / limit) if limit > 0 else 0
    page = (skip // limit) + 1 if limit > 0 else 1
    return HomeworkListResponse(
        data=homework_service.to_list_responses(
            db,
            items,
            tenant_id=current_user.tenant_id,
            user_id=current_user.id,
        ),
        total=total,
        page=page,
        size=limit,
        pages=pages,
    )


@router.get("/{homework_id}", response_model=HomeworkResponse)
def get_homework(
    homework_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    viewer_context = homework_service.get_viewer_context(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        email=str(current_user.email),
        legacy_role=current_user.role,
    )
    hw = homework_service.get_homework(
        db,
        tenant_id=current_user.tenant_id,
        homework_id=homework_id,
        viewer_context=viewer_context,
    )
    # Opening details counts as "read" for the sidebar badge.
    homework_service.mark_homework_viewed(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        homework_id=homework_id,
        viewer_context=viewer_context,
    )
    return homework_service._to_response(hw)


@router.post("", response_model=HomeworkResponse, status_code=status.HTTP_201_CREATED)
def create_homework(
    payload: HomeworkCreate,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    hw = homework_service.create_homework(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        payload=payload,
    )
    return homework_service._to_response(hw)


@router.put("/{homework_id}", response_model=HomeworkResponse)
def update_homework(
    payload: HomeworkUpdate,
    homework_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    hw = homework_service.update_homework(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        homework_id=homework_id,
        payload=payload,
    )
    return homework_service._to_response(hw)


@router.delete("/{homework_id}", status_code=status.HTTP_200_OK)
def delete_homework(
    homework_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    return homework_service.delete_homework(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        homework_id=homework_id,
    )


# ---------------------------------------------------------------------------
# Attachments
# ---------------------------------------------------------------------------

@router.post(
    "/{homework_id}/attachments",
    response_model=HomeworkAttachmentResponse,
    status_code=status.HTTP_201_CREATED,
)
def upload_attachment(
    homework_id: int = Path(..., ge=1),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    """Upload a file attachment for the given homework."""
    viewer_context = homework_service.get_viewer_context(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        email=str(current_user.email),
        legacy_role=current_user.role,
    )
    homework_service.get_homework(
        db,
        tenant_id=current_user.tenant_id,
        homework_id=homework_id,
        viewer_context=viewer_context,
    )

    extension = os.path.splitext(file.filename or "")[1].lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Allowed: images, PDF, Word, text files",
        )

    content = file.file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeded. Maximum allowed size is {MAX_FILE_SIZE_MB} MB",
        )

    try:
        stored_path = save_homework_attachment_file(
            tenant_id=current_user.tenant_id,
            homework_id=homework_id,
            file_name=file.filename or f"attachment{extension}",
            content=content,
            content_type=file.content_type,
        )
    except ValidationException as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=exc.message,
        ) from exc

    return homework_service.add_attachment(
        db,
        tenant_id=current_user.tenant_id,
        homework_id=homework_id,
        file_name=file.filename or stored_path.rsplit("/", 1)[-1],
        file_path=stored_path,
        file_type=extension.lstrip("."),
        file_size_kb=int(len(content) / 1024),
        uploaded_by=current_user.id,
    )


@router.delete(
    "/{homework_id}/attachments/{attachment_id}",
    status_code=status.HTTP_200_OK,
)
def delete_attachment(
    homework_id: int = Path(..., ge=1),
    attachment_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    """Remove an attachment from a homework record."""
    viewer_context = homework_service.get_viewer_context(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        email=str(current_user.email),
        legacy_role=current_user.role,
    )
    homework_service.get_homework(
        db,
        tenant_id=current_user.tenant_id,
        homework_id=homework_id,
        viewer_context=viewer_context,
    )
    homework_service.delete_attachment(
        db,
        tenant_id=current_user.tenant_id,
        homework_id=homework_id,
        attachment_id=attachment_id,
    )
    
    return {"message": "Attachment deleted successfully"}
