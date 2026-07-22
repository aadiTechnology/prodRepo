from __future__ import annotations

from typing import List, Optional, Tuple

from datetime import date, timedelta

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictException, ValidationException

from app.models.homework import Homework, HomeworkAttachment
from app.repositories import homework_repository as repo
from app.services.homework_access import (
    HomeworkViewerContext,
    homework_visible_to_viewer,
    resolve_homework_viewer_context,
)
from app.schemas.homework_schema import (
    ClassOption,
    HomeworkAttachmentResponse,
    HomeworkCreate,
    HomeworkResponse,
    HomeworkUpdate,
    SubjectOption,
)
from app.utils.homework_status import (
    HOMEWORK_STATUS_ACTIVE,
    from_db_homework_status,
    is_draft_homework_status,
    normalize_homework_status,
)


# ---------------------------------------------------------------------------
# Mapping helper (ORM → response schema)
# ---------------------------------------------------------------------------

def to_list_responses(
    db: Session,
    items: List[Homework],
    *,
    tenant_id: int,
    user_id: int,
) -> List[HomeworkResponse]:
    """Map homework rows to API responses, including per-user is_viewed flags."""
    viewed_ids = (
        repo.get_viewed_homework_ids(
            db,
            tenant_id=tenant_id,
            user_id=user_id,
            homework_ids=[int(hw.id) for hw in items],
        )
        if items
        else set()
    )
    return [
        _to_response(hw, is_viewed=int(hw.id) in viewed_ids)
        for hw in items
    ]


def _to_response(hw: Homework, *, is_viewed: bool = False) -> HomeworkResponse:
    return HomeworkResponse(
        id=hw.id,
        tenant_id=hw.tenant_id,
        teacher_id=hw.teacher_id,
        teacher_name=hw.teacher.full_name if hw.teacher else None,
        class_id=hw.class_id,
        class_name=hw.class_model.name if hw.class_model else None,
        class_division_id=hw.class_division_id,
        division_name=hw.division.division_name if hw.division else None,
        subject_id=hw.subject_id,
        subject_name=hw.subject.name if hw.subject else None,
        academic_year_id=hw.academic_year_id,
        academic_year_name=hw.academic_year.name if hw.academic_year else None,
        title=hw.title,
        instructions=hw.instructions,
        assigned_date=hw.assigned_date,
        submission_date=hw.submission_date,
        status=from_db_homework_status(hw.status),
        notify_parents=hw.notify_parents,
        published_at=hw.published_at,
        created_at=hw.created_at,
        updated_at=hw.updated_at,
        attachments=[
            {
                "id": a.id,
                "homework_id": a.homework_id,
                "file_name": a.file_name,
                "file_path": a.file_path,
                "file_type": a.file_type,
                "file_size_kb": a.file_size_kb,
                "uploaded_at": a.uploaded_at,
            }
            for a in hw.attachments
        ],
        is_viewed=is_viewed,
    )


# ---------------------------------------------------------------------------
# Re-export repo helper used directly by the router for teacher resolution
# ---------------------------------------------------------------------------

def _resolve_teacher_id(db: Session, tenant_id: int, user_id: int) -> Optional[int]:
    return repo._resolve_teacher_id(db, tenant_id, user_id)


def get_viewer_context(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    email: str,
    legacy_role: object,
) -> HomeworkViewerContext:
    teacher_id = repo._resolve_teacher_id(db, tenant_id, user_id)
    return resolve_homework_viewer_context(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        email=email,
        legacy_role=legacy_role,
        teacher_id=teacher_id,
    )


# ---------------------------------------------------------------------------
# Edit/delete window
# ---------------------------------------------------------------------------

HOMEWORK_EDIT_DELETE_WINDOW_DAYS = 7


def _integrity_hint(exc: IntegrityError) -> str:
    raw = str(getattr(exc, "orig", exc) or exc).strip()
    return raw[:900] if raw else ""


def _raise_homework_integrity(exc: IntegrityError) -> None:
    hint = _integrity_hint(exc)
    db_err = hint.lower()

    if "ck_homework_status" in db_err or (
        "check constraint" in db_err and "status" in db_err
    ):
        raise ValidationException(
            "Homework status was rejected by the database. "
            "Deploy the latest API build so Active/Draft map to published/draft."
            + (f" Detail: {hint}" if hint else "")
        ) from exc

    if "cannot insert the value null" in db_err and "submission_date" in db_err:
        raise ValidationException(
            "Submission date is optional, but the database still requires it. "
            "Run migration e5f6a7b8c9d0 or scripts/homework_submission_date_nullable.sql "
            "on SQL Server to allow NULL submission_date."
            + (f" Detail: {hint}" if hint else "")
        ) from exc

    if "ck_homework_dates" in db_err or (
        "check constraint" in db_err and "submission_date" in db_err
    ):
        raise ValidationException(
            "Submission date must be on or after the assigned date."
            + (f" Detail: {hint}" if hint else "")
        ) from exc

    if "foreign key" in db_err or "referenced table" in db_err:
        raise ValidationException(
            "One of the selected values is invalid "
            "(class, division, subject, teacher, or academic year)."
            + (f" Detail: {hint}" if hint else "")
        ) from exc

    if "2627" in db_err or "2601" in db_err or "duplicate" in db_err or "unique key" in db_err:
        raise ConflictException(
            "A homework record with the same details may already exist."
            + (f" Detail: {hint}" if hint else "")
        ) from exc

    raise ConflictException(
        "Could not save homework due to a database constraint."
        + (f" Detail: {hint}" if hint else "")
    ) from exc


def _assert_homework_editable(hw: Homework) -> None:
    if is_draft_homework_status(hw.status):
        return
    cutoff = hw.assigned_date + timedelta(days=HOMEWORK_EDIT_DELETE_WINDOW_DAYS)
    if date.today() >= cutoff:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Homework cannot be edited or deleted after "
                f"{HOMEWORK_EDIT_DELETE_WINDOW_DAYS} days from the assigned date"
            ),
        )


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

def list_homework(
    db: Session,
    *,
    tenant_id: int,
    teacher_id: Optional[int] = None,
    class_id: Optional[int] = None,
    class_division_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    academic_year_id: Optional[int] = None,
    hw_status: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 25,
    viewer_context: Optional[HomeworkViewerContext] = None,
) -> Tuple[List[Homework], int]:
    effective_status = normalize_homework_status(hw_status) if hw_status else hw_status
    if viewer_context is not None and viewer_context.published_only:
        effective_status = HOMEWORK_STATUS_ACTIVE

    return repo.list_homework(
        db,
        tenant_id=tenant_id,
        teacher_id=teacher_id,
        class_id=class_id,
        class_division_id=class_division_id,
        subject_id=subject_id,
        academic_year_id=academic_year_id,
        hw_status=effective_status,
        search=search,
        skip=skip,
        limit=limit,
        viewer_context=viewer_context,
    )


def get_homework(
    db: Session,
    *,
    tenant_id: int,
    homework_id: int,
    viewer_context: Optional[HomeworkViewerContext] = None,
) -> Homework:
    hw = repo.get_homework(db, tenant_id=tenant_id, homework_id=homework_id)
    if viewer_context is not None and not homework_visible_to_viewer(hw, viewer_context):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Homework details not found",
        )
    return hw


def count_unread_homework(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    viewer_context: HomeworkViewerContext,
    class_id: Optional[int] = None,
    class_division_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    academic_year_id: Optional[int] = None,
) -> int:
    return repo.count_unread_homework(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        class_id=class_id,
        class_division_id=class_division_id,
        subject_id=subject_id,
        academic_year_id=academic_year_id,
        viewer_context=viewer_context,
    )


def mark_homework_viewed(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    homework_id: int,
    viewer_context: Optional[HomeworkViewerContext] = None,
) -> tuple[bool, int]:
    """
    Mark homework as viewed by current user.
    Returns (already_viewed, homework_id).
    """
    hw = get_homework(
        db,
        tenant_id=tenant_id,
        homework_id=homework_id,
        viewer_context=viewer_context,
    )
    _row, already_viewed = repo.mark_homework_viewed(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        homework_id=int(hw.id),
    )
    return already_viewed, int(hw.id)


def create_homework(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    payload: HomeworkCreate,
) -> Homework:
    if payload.teacher_id:
        teacher_id = payload.teacher_id
    else:
        teacher_id = repo._resolve_teacher_id(db, tenant_id, user_id)
        if teacher_id is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    "No teacher profile is linked to your account. "
                    "Ask the administrator to link your user account to a teacher profile, "
                    "or provide teacher_id explicitly."
                ),
            )

    if payload.submission_date is not None and payload.submission_date < payload.assigned_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Submission date cannot be before assigned date",
        )

    try:
        return repo.create_homework(
            db,
            tenant_id=tenant_id,
            teacher_id=teacher_id,
            user_id=user_id,
            class_id=payload.class_id,
            class_division_id=payload.class_division_id,
            subject_id=payload.subject_id,
            academic_year_id=payload.academic_year_id,
            title=payload.title,
            instructions=payload.instructions,
            assigned_date=payload.assigned_date,
            submission_date=payload.submission_date,
            hw_status=payload.status,
            notify_parents=payload.notify_parents,
        )
    except IntegrityError as exc:
        db.rollback()
        _raise_homework_integrity(exc)


def update_homework(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    homework_id: int,
    payload: HomeworkUpdate,
) -> Homework:
    hw = repo.get_homework(db, tenant_id=tenant_id, homework_id=homework_id)
    _assert_homework_editable(hw)
    update_data = payload.model_dump(exclude_unset=True)

    new_submission = update_data.get("submission_date", hw.submission_date)
    new_assigned = update_data.get("assigned_date", hw.assigned_date)
    if new_submission is not None and new_submission < new_assigned:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Submission date cannot be before assigned date",
        )

    try:
        return repo.update_homework(db, hw=hw, user_id=user_id, update_data=update_data)
    except IntegrityError as exc:
        db.rollback()
        _raise_homework_integrity(exc)


def delete_homework(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    homework_id: int,
) -> dict:
    hw = repo.get_homework(db, tenant_id=tenant_id, homework_id=homework_id)
    _assert_homework_editable(hw)
    repo.soft_delete_homework(db, hw=hw, user_id=user_id)
    return {"message": "Homework deleted successfully"}


# ---------------------------------------------------------------------------
# Attachments
# ---------------------------------------------------------------------------

def add_attachment(
    db: Session,
    *,
    tenant_id: int,
    homework_id: int,
    file_name: str,
    file_path: str,
    file_type: Optional[str],
    file_size_kb: Optional[int],
    uploaded_by: int,
) -> HomeworkAttachment:
    hw = repo.get_homework(db, tenant_id=tenant_id, homework_id=homework_id)
    _assert_homework_editable(hw)
    return repo.add_attachment(
        db,
        homework_id=homework_id,
        file_name=file_name,
        file_path=file_path,
        file_type=file_type,
        file_size_kb=file_size_kb,
        uploaded_by=uploaded_by,
    )


def delete_attachment(
    db: Session,
    *,
    tenant_id: int,
    homework_id: int,
    attachment_id: int,
) -> dict:
    hw = repo.get_homework(db, tenant_id=tenant_id, homework_id=homework_id)
    _assert_homework_editable(hw)
    att = repo.get_attachment(db, homework_id=homework_id, attachment_id=attachment_id)
    file_path = repo.delete_attachment(db, att=att)
    return {"file_path": file_path}


# ---------------------------------------------------------------------------
# Dropdowns
# ---------------------------------------------------------------------------

def get_classes_for_teacher(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
) -> list:
    return repo.get_classes_for_teacher(db, tenant_id=tenant_id, user_id=user_id)


def get_divisions_for_teacher_class(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    class_id: int,
) -> list:
    return repo.get_divisions_for_teacher_class(
        db, tenant_id=tenant_id, user_id=user_id, class_id=class_id
    )


def get_subjects_for_teacher_class(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    class_id: int,
    academic_year_id: Optional[int] = None,
) -> list:
    return repo.get_subjects_for_teacher_class(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        class_id=class_id,
        academic_year_id=academic_year_id,
    )
