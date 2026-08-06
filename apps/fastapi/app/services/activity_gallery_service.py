from __future__ import annotations

import math
import os
from datetime import date
from urllib.parse import urlparse

from sqlalchemy.orm import Session

from app.core.exceptions import ForbiddenException, NotFoundException, ValidationException
from app.repositories import activity_gallery_repository as repo
from app.repositories import homework_repository
from app.schemas.activity_gallery_schema import (
    ActivityGalleryClassMappingResponse,
    ActivityGalleryClassTarget,
    ActivityGalleryCreate,
    ActivityGalleryDeleteResponse,
    ActivityGalleryListItem,
    ActivityGalleryListResponse,
    ActivityGalleryMediaResponse,
    ActivityGalleryPublishResponse,
    ActivityGalleryResponse,
    ActivityGalleryUpdate,
    ClassOption,
    DivisionOption,
    GalleryAccessPermissionsResponse,
    TeacherGalleryClassDivision,
    TeacherGalleryClassOption,
    TeacherGalleryScopeResponse,
)
from app.services.activity_gallery_access import (
    ACTIVITY_GALLERY_MENU_PATH,
    MAX_MEDIA_PER_GALLERY,
    MAX_PHOTO_GALLERY_TOTAL_BYTES,
    MAX_PHOTO_GALLERY_TOTAL_MB,
    GalleryViewerContext,
    assert_gallery_manage_access,
    gallery_visible_to_viewer,
    resolve_gallery_viewer_context,
    teacher_can_manage_class_division,
    user_can_create_gallery,
    user_can_delete_gallery,
    user_can_download_gallery,
    user_can_edit_gallery,
    user_can_view_gallery,
    user_can_manage_galleries,
)
from app.services.activity_gallery_media_storage import (
    delete_gallery_media_file,
    download_gallery_media_bytes,
    is_azure_gallery_media_path,
    is_db_stored_media_path,
    legacy_disk_path,
    mime_type_for_file_name,
    resolve_media_url,
    save_gallery_photo_file,
)
from app.services.activity_gallery_youtube import extract_youtube_video_id, normalize_youtube_url

__all__ = ["ACTIVITY_GALLERY_MENU_PATH"]


def get_viewer_context(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    email: str,
    legacy_role: object,
    manage: bool = False,
) -> GalleryViewerContext:
    return resolve_gallery_viewer_context(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        email=email,
        legacy_role=legacy_role,
        manage=manage,
    )


def _assert_active_academic_year(db: Session, *, tenant_id: int) -> None:
    if not repo.has_active_academic_year(db, tenant_id=tenant_id):
        raise ValidationException("Academic year must be active")


def _assert_manage_access(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    legacy_role: object,
    class_id: int,
    division_id: int,
) -> None:
    assert_gallery_manage_access(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        legacy_role=legacy_role,
        class_id=class_id,
        division_id=division_id,
    )


def _to_media_response(row: dict) -> ActivityGalleryMediaResponse:
    return ActivityGalleryMediaResponse(
        id=int(row["id"]),
        gallery_id=int(row["gallery_id"]),
        media_type=row["media_type"],
        file_name=str(row["file_name"]),
        original_file_name=row.get("original_file_name"),
        file_path=resolve_media_url(str(row["file_path"])),
        file_size=int(row["file_size"]) if row.get("file_size") is not None else None,
        display_order=int(row.get("display_order") or 1),
        uploaded_at=row["uploaded_at"],
    )


def _to_gallery_response(db: Session, row: dict, *, include_media: bool = True) -> ActivityGalleryResponse:
    mappings = repo.get_class_mappings(db, gallery_id=int(row["id"]))
    media_rows = repo.get_media_items(db, gallery_id=int(row["id"])) if include_media else []
    photo_count = int(row.get("photo_count") or 0)
    video_count = int(row.get("video_count") or 0)
    if include_media and not photo_count and not video_count:
        photo_count = sum(1 for m in media_rows if m.get("media_type") == "Photo")
        video_count = sum(1 for m in media_rows if m.get("media_type") == "Video")

    return ActivityGalleryResponse(
        id=int(row["id"]),
        tenant_id=int(row["tenant_id"]),
        gallery_name=str(row["gallery_name"]),
        gallery_type=row["gallery_type"],
        description=row.get("description"),
        activity_date=row["activity_date"],
        created_by=int(row["created_by"]),
        is_published=bool(row.get("is_published")),
        status=int(row.get("status") or 1),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        class_id=int(row["class_id"]) if row.get("class_id") is not None else None,
        class_name=row.get("class_name"),
        division_id=int(row["division_id"]) if row.get("division_id") is not None else None,
        division_name=row.get("division_name"),
        photo_count=photo_count,
        video_count=video_count,
        media_count=photo_count + video_count,
        class_mappings=[
            ActivityGalleryClassMappingResponse(
                id=int(m["id"]),
                gallery_id=int(m["gallery_id"]),
                class_id=int(m["class_id"]),
                division_id=int(m["division_id"]),
                class_name=m.get("class_name"),
                division_name=m.get("division_name"),
                created_at=m.get("created_at"),
            )
            for m in mappings
        ],
        media_items=[_to_media_response(m) for m in media_rows],
    )


def _to_list_item(row: dict) -> ActivityGalleryListItem:
    photo_count = int(row.get("photo_count") or 0)
    video_count = int(row.get("video_count") or 0)
    return ActivityGalleryListItem(
        id=int(row["id"]),
        tenant_id=int(row["tenant_id"]),
        gallery_name=str(row["gallery_name"]),
        gallery_type=row["gallery_type"],
        activity_date=row["activity_date"],
        description=row.get("description"),
        is_published=bool(row.get("is_published")),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        class_id=int(row["class_id"]) if row.get("class_id") is not None else None,
        class_name=row.get("class_name"),
        division_id=int(row["division_id"]) if row.get("division_id") is not None else None,
        division_name=row.get("division_name"),
        photo_count=photo_count,
        video_count=video_count,
        media_count=photo_count + video_count,
    )


def _assert_gallery_visible(
    db: Session,
    *,
    tenant_id: int,
    gallery_id: int,
    viewer_context: GalleryViewerContext | None,
) -> dict:
    row = repo.get_gallery_by_id(db, tenant_id=tenant_id, gallery_id=gallery_id)
    if not row:
        raise NotFoundException("Activity gallery", gallery_id)

    if viewer_context:
        # Check ALL class mappings — get_gallery_by_id only returns TOP 1 pair,
        # which incorrectly 403s other mapped classes on detail/download.
        mappings = repo.get_class_mappings(db, gallery_id=gallery_id)
        class_mappings = [
            (int(m["class_id"]), int(m["division_id"]))
            for m in mappings
            if m.get("class_id") is not None and m.get("division_id") is not None
        ]
        if not gallery_visible_to_viewer(
            class_mappings=class_mappings,
            is_published=bool(row.get("is_published")),
            ctx=viewer_context,
        ):
            raise ForbiddenException("You are not authorized for this activity")
    return row


def _get_manageable_gallery(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    legacy_role: object,
    gallery_id: int,
) -> dict:
    row = repo.get_gallery_by_id(db, tenant_id=tenant_id, gallery_id=gallery_id)
    if not row:
        raise NotFoundException("Activity gallery", gallery_id)

    mappings = repo.get_class_mappings(db, gallery_id=gallery_id)
    if not mappings:
        raise ValidationException("Please select class and division")

    for mapping in mappings:
        _assert_manage_access(
            db,
            tenant_id=tenant_id,
            user_id=user_id,
            legacy_role=legacy_role,
            class_id=int(mapping["class_id"]),
            division_id=int(mapping["division_id"]),
        )
    return row


def _assert_targets_manage_access(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    legacy_role: object,
    targets: list,
) -> None:
    if not targets:
        raise ValidationException("Please select class and division")
    for target in targets:
        _assert_manage_access(
            db,
            tenant_id=tenant_id,
            user_id=user_id,
            legacy_role=legacy_role,
            class_id=int(target.class_id),
            division_id=int(target.division_id),
        )


def list_galleries(
    db: Session,
    *,
    tenant_id: int,
    gallery_type: str | None,
    search: str | None,
    page: int,
    size: int,
    viewer_context: GalleryViewerContext | None = None,
) -> ActivityGalleryListResponse:
    skip = page * size
    rows, total = repo.list_galleries(
        db,
        tenant_id=tenant_id,
        gallery_type=gallery_type,
        search=search,
        skip=skip,
        limit=size,
        viewer_context=viewer_context,
    )
    pages = math.ceil(total / size) if size > 0 else 0
    return ActivityGalleryListResponse(
        data=[_to_list_item(row) for row in rows],
        total=total,
        page=page,
        size=size,
        pages=pages,
    )


def get_gallery(
    db: Session,
    *,
    tenant_id: int,
    gallery_id: int,
    viewer_context: GalleryViewerContext | None = None,
) -> ActivityGalleryResponse:
    row = _assert_gallery_visible(
        db,
        tenant_id=tenant_id,
        gallery_id=gallery_id,
        viewer_context=viewer_context,
    )
    return _to_gallery_response(db, row)


def create_gallery(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    legacy_role: object,
    payload: ActivityGalleryCreate,
) -> ActivityGalleryResponse:
    _assert_active_academic_year(db, tenant_id=tenant_id)

    if not payload.gallery_name.strip():
        raise ValidationException("Please enter gallery name")
    if not payload.activity_date:
        raise ValidationException("Please select activity date")

    if not payload.targets:
        raise ValidationException("Please select class and division")

    _assert_targets_manage_access(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        legacy_role=legacy_role,
        targets=payload.targets,
    )

    gallery_id = repo.insert_gallery(
        db,
        tenant_id=tenant_id,
        gallery_name=payload.gallery_name.strip(),
        gallery_type=payload.gallery_type,
        description=payload.description.strip() if payload.description else None,
        activity_date=payload.activity_date,
        created_by=user_id,
    )
    repo.replace_class_mappings(
        db,
        gallery_id=gallery_id,
        targets=[(target.class_id, target.division_id) for target in payload.targets],
    )
    row = repo.get_gallery_by_id(db, tenant_id=tenant_id, gallery_id=gallery_id)
    if not row:
        raise NotFoundException("Activity gallery", gallery_id)
    return _to_gallery_response(db, row)


def update_gallery(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    legacy_role: object,
    gallery_id: int,
    payload: ActivityGalleryUpdate,
) -> ActivityGalleryResponse:
    _assert_active_academic_year(db, tenant_id=tenant_id)
    row = _get_manageable_gallery(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        legacy_role=legacy_role,
        gallery_id=gallery_id,
    )

    if payload.targets is not None:
        _assert_targets_manage_access(
            db,
            tenant_id=tenant_id,
            user_id=user_id,
            legacy_role=legacy_role,
            targets=payload.targets,
        )

    updates: dict = {}
    if payload.gallery_name is not None:
        if not payload.gallery_name.strip():
            raise ValidationException("Please enter gallery name")
        updates["gallery_name"] = payload.gallery_name.strip()
    if payload.activity_date is not None:
        updates["activity_date"] = payload.activity_date
    if payload.description is not None:
        updates["description"] = payload.description.strip() or None

    if updates:
        repo.update_gallery(db, gallery_id=gallery_id, tenant_id=tenant_id, updates=updates)

    if payload.targets is not None:
        repo.replace_class_mappings(
            db,
            gallery_id=gallery_id,
            targets=[(target.class_id, target.division_id) for target in payload.targets],
        )

    updated = repo.get_gallery_by_id(db, tenant_id=tenant_id, gallery_id=gallery_id)
    if not updated:
        raise NotFoundException("Activity gallery", gallery_id)
    return _to_gallery_response(db, updated)


def delete_gallery(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    legacy_role: object,
    gallery_id: int,
) -> ActivityGalleryDeleteResponse:
    _get_manageable_gallery(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        legacy_role=legacy_role,
        gallery_id=gallery_id,
    )
    repo.soft_delete_gallery(db, gallery_id=gallery_id, tenant_id=tenant_id)
    return ActivityGalleryDeleteResponse(message="Gallery deleted successfully")


def publish_gallery(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    legacy_role: object,
    gallery_id: int,
) -> ActivityGalleryPublishResponse:
    _assert_active_academic_year(db, tenant_id=tenant_id)
    row = _get_manageable_gallery(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        legacy_role=legacy_role,
        gallery_id=gallery_id,
    )

    gallery_type = str(row["gallery_type"])
    media_count = repo.count_media_by_type(db, gallery_id=gallery_id, media_type=gallery_type)
    if media_count < 1:
        raise ValidationException("Please upload at least one file")

    try:
        repo.publish_gallery(db, gallery_id=gallery_id, tenant_id=tenant_id)
    except Exception as exc:
        raise ValidationException("Unable to publish gallery.") from exc

    updated = repo.get_gallery_by_id(db, tenant_id=tenant_id, gallery_id=gallery_id)
    if not updated:
        raise NotFoundException("Activity gallery", gallery_id)
    return ActivityGalleryPublishResponse(
        message="Gallery published successfully",
        gallery=_to_gallery_response(db, updated),
    )


def _assert_photo_gallery_total_size(
    db: Session,
    *,
    gallery_id: int,
    incoming_bytes: int,
) -> None:
    existing_bytes = repo.sum_media_file_size(db, gallery_id=gallery_id, media_type="Photo")
    if existing_bytes + incoming_bytes > MAX_PHOTO_GALLERY_TOTAL_BYTES:
        raise ValidationException(
            f"Total photo size cannot exceed {MAX_PHOTO_GALLERY_TOTAL_MB} MB for all images"
        )


def upload_media(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    legacy_role: object,
    gallery_id: int,
    filename: str,
    content: bytes,
    content_type: str | None = None,
) -> ActivityGalleryMediaResponse:
    row = _get_manageable_gallery(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        legacy_role=legacy_role,
        gallery_id=gallery_id,
    )

    media_type = str(row["gallery_type"])
    if media_type == "Video":
        raise ValidationException("Video galleries only support YouTube links")

    current_count = repo.count_media_by_type(db, gallery_id=gallery_id, media_type=media_type)
    if current_count >= MAX_MEDIA_PER_GALLERY:
        raise ValidationException("Maximum 20 files allowed")

    if media_type == "Photo":
        _assert_photo_gallery_total_size(db, gallery_id=gallery_id, incoming_bytes=len(content))

    blob_name, safe_name = save_gallery_photo_file(
        tenant_id=tenant_id,
        gallery_id=gallery_id,
        original_filename=filename,
        content=content,
        content_type=content_type,
    )
    media_id = repo.insert_media(
        db,
        gallery_id=gallery_id,
        media_type=media_type,
        file_name=safe_name,
        original_file_name=filename,
        file_path=blob_name,
        file_content=None,
        file_size=len(content),
        display_order=current_count + 1,
    )
    media_row = repo.get_media_by_id(db, gallery_id=gallery_id, media_id=media_id)
    if not media_row:
        raise NotFoundException("Gallery media", media_id)
    repo.update_gallery(db, gallery_id=gallery_id, tenant_id=tenant_id, updates={})
    return _to_media_response(media_row)


def add_video_link(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    legacy_role: object,
    gallery_id: int,
    video_url: str,
) -> ActivityGalleryMediaResponse:
    row = _get_manageable_gallery(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        legacy_role=legacy_role,
        gallery_id=gallery_id,
    )

    if str(row["gallery_type"]) != "Video":
        raise ValidationException("Video links are only supported for video galleries")

    current_count = repo.count_media_by_type(db, gallery_id=gallery_id, media_type="Video")
    if current_count >= MAX_MEDIA_PER_GALLERY:
        raise ValidationException("Maximum 20 files allowed")

    trimmed_url = video_url.strip()
    if not trimmed_url:
        raise ValidationException("Please enter a valid video URL")

    video_id = extract_youtube_video_id(trimmed_url)
    if video_id:
        storage_url, file_name = normalize_youtube_url(trimmed_url)[0], f"youtube_{video_id}"
    else:
        parsed = urlparse(trimmed_url)
        if parsed.scheme.lower() not in {"http", "https"} or not parsed.netloc:
            raise ValidationException("Please enter a valid video URL")
        storage_url, file_name = trimmed_url, f"video_link_{current_count + 1}"

    media_id = repo.insert_media(
        db,
        gallery_id=gallery_id,
        media_type="Video",
        file_name=file_name,
        original_file_name=trimmed_url,
        file_path=storage_url,
        file_size=None,
        display_order=current_count + 1,
    )
    media_row = repo.get_media_by_id(db, gallery_id=gallery_id, media_id=media_id)
    if not media_row:
        raise NotFoundException("Gallery media", media_id)
    repo.update_gallery(db, gallery_id=gallery_id, tenant_id=tenant_id, updates={})
    return _to_media_response(media_row)


def upload_media_bulk(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    legacy_role: object,
    gallery_id: int,
    files: list[tuple[str, bytes, str | None]],
) -> list[ActivityGalleryMediaResponse]:
    if files:
        row = _get_manageable_gallery(
            db,
            tenant_id=tenant_id,
            user_id=user_id,
            legacy_role=legacy_role,
            gallery_id=gallery_id,
        )
        if str(row["gallery_type"]) == "Photo":
            batch_bytes = sum(len(content) for _, content, _ in files)
            _assert_photo_gallery_total_size(
                db,
                gallery_id=gallery_id,
                incoming_bytes=batch_bytes,
            )

    results: list[ActivityGalleryMediaResponse] = []
    for filename, content, content_type in files:
        results.append(
            upload_media(
                db,
                tenant_id=tenant_id,
                user_id=user_id,
                legacy_role=legacy_role,
                gallery_id=gallery_id,
                filename=filename,
                content=content,
                content_type=content_type,
            )
        )
    return results


def delete_media(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    legacy_role: object,
    gallery_id: int,
    media_id: int,
) -> ActivityGalleryDeleteResponse:
    _get_manageable_gallery(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        legacy_role=legacy_role,
        gallery_id=gallery_id,
    )

    media_row = repo.soft_delete_media(db, gallery_id=gallery_id, media_id=media_id)
    if not media_row:
        raise NotFoundException("Gallery media", media_id)

    try:
        stored_path = str(media_row["file_path"])
        delete_gallery_media_file(stored_path)
        if not stored_path.startswith(("http://", "https://")) and not is_db_stored_media_path(
            stored_path
        ) and not is_azure_gallery_media_path(stored_path):
            file_path = legacy_disk_path(stored_path)
            if os.path.exists(file_path):
                os.remove(file_path)
    except OSError:
        pass

    repo.update_gallery(db, gallery_id=gallery_id, tenant_id=tenant_id, updates={})
    return ActivityGalleryDeleteResponse(message="Media deleted successfully")


def _resolve_media_bytes(
    media_row: dict,
) -> tuple[bytes, str, str]:
    stored_path = str(media_row["file_path"])
    download_name = str(
        media_row.get("original_file_name") or media_row.get("file_name") or "download"
    )
    file_content = media_row.get("file_content")
    if file_content is not None:
        mime = mime_type_for_file_name(str(media_row.get("file_name") or download_name))
        return bytes(file_content), mime, download_name

    azure_bytes = download_gallery_media_bytes(stored_path)
    if azure_bytes is not None:
        mime = mime_type_for_file_name(str(media_row.get("file_name") or download_name))
        return azure_bytes, mime, download_name

    if is_db_stored_media_path(stored_path):
        raise NotFoundException("Gallery media content", media_row.get("id"))

    disk_path = legacy_disk_path(stored_path)
    if not os.path.isfile(disk_path):
        raise NotFoundException("Gallery media file", media_row.get("id"))
    with open(disk_path, "rb") as handle:
        content = handle.read()
    mime = mime_type_for_file_name(str(media_row.get("file_name") or download_name))
    return content, mime, download_name


def get_media_content(
    db: Session,
    *,
    tenant_id: int,
    gallery_id: int,
    media_id: int,
    viewer_context: GalleryViewerContext | None,
) -> tuple[bytes, str, str]:
    _assert_gallery_visible(
        db,
        tenant_id=tenant_id,
        gallery_id=gallery_id,
        viewer_context=viewer_context,
    )
    media_row = repo.get_media_by_id(db, gallery_id=gallery_id, media_id=media_id)
    if not media_row:
        raise NotFoundException("Gallery media", media_id)
    return _resolve_media_bytes(media_row)


def get_media_for_download(
    db: Session,
    *,
    tenant_id: int,
    gallery_id: int,
    media_id: int,
    viewer_context: GalleryViewerContext | None,
) -> tuple[bytes | None, str | None, str, str]:
    """Return (content_bytes, disk_path, mime, download_name). Exactly one of content or disk_path is set."""
    _assert_gallery_visible(
        db,
        tenant_id=tenant_id,
        gallery_id=gallery_id,
        viewer_context=viewer_context,
    )
    media_row = repo.get_media_by_id(db, gallery_id=gallery_id, media_id=media_id)
    if not media_row:
        raise NotFoundException("Gallery media", media_id)

    stored_path = str(media_row["file_path"])
    download_name = str(
        media_row.get("original_file_name") or media_row.get("file_name") or "download"
    )
    mime = mime_type_for_file_name(str(media_row.get("file_name") or download_name))

    file_content = media_row.get("file_content")
    if file_content is not None:
        return bytes(file_content), None, mime, download_name

    azure_bytes = download_gallery_media_bytes(stored_path)
    if azure_bytes is not None:
        return azure_bytes, None, mime, download_name

    if is_db_stored_media_path(stored_path):
        raise NotFoundException("Gallery media content", media_id)

    disk_path = legacy_disk_path(stored_path)
    if not os.path.isfile(disk_path):
        raise NotFoundException("Gallery media file", media_id)
    return None, disk_path, mime, download_name


def get_classes_for_teacher(db: Session, *, tenant_id: int, user_id: int) -> list[ClassOption]:
    return homework_repository.get_classes_for_teacher(db, tenant_id=tenant_id, user_id=user_id)


def get_divisions_for_class(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    class_id: int,
) -> list[DivisionOption]:
    rows = homework_repository.get_divisions_for_teacher_class(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        class_id=class_id,
    )
    return [DivisionOption(id=r["id"], division_name=r["division_name"]) for r in rows]


def user_can_manage(db: Session, current_user: object) -> bool:
    return user_can_manage_galleries(db, current_user)


def get_my_gallery_permissions(db: Session, current_user: object) -> GalleryAccessPermissionsResponse:
    return GalleryAccessPermissionsResponse(
        can_view=user_can_view_gallery(db, current_user),
        can_create=user_can_create_gallery(db, current_user),
        can_edit=user_can_edit_gallery(db, current_user),
        can_delete=user_can_delete_gallery(db, current_user),
        can_download=user_can_download_gallery(db, current_user),
    )


def get_teacher_gallery_scope(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
) -> TeacherGalleryScopeResponse:
    from sqlalchemy import text

    from app.models.academic import SchoolClass
    from app.services.homework_access import ClassDivisionScope, resolve_teacher_assignment_scopes

    teacher_id = homework_repository._resolve_teacher_id(db, tenant_id, user_id)
    if teacher_id is None:
        return TeacherGalleryScopeResponse(is_teacher=False)

    from app.models.teacher import Teacher

    teacher_row = (
        db.query(Teacher)
        .filter(
            Teacher.id == teacher_id,
            Teacher.tenant_id == tenant_id,
            Teacher.is_deleted == False,  # noqa: E712
        )
        .first()
    )

    default_sql = text(
        """
        SELECT DISTINCT ta.class_id, ta.class_division_id AS division_id
        FROM teacher_assignments ta
        WHERE ta.tenant_id = :tenant_id
          AND ta.teacher_id = :teacher_id
          AND ta.is_active = 1
          AND ta.subject_id IS NULL
          AND ta.class_division_id IS NOT NULL
        """
    )
    default_rows = db.execute(
        default_sql, {"tenant_id": tenant_id, "teacher_id": teacher_id}
    ).mappings().all()
    default_targets = [
        ActivityGalleryClassTarget(
            class_id=int(row["class_id"]),
            division_id=int(row["division_id"]),
        )
        for row in default_rows
    ]
    if (
        not default_targets
        and teacher_row
        and teacher_row.class_id is not None
        and teacher_row.class_division_id is not None
    ):
        default_targets = [
            ActivityGalleryClassTarget(
                class_id=int(teacher_row.class_id),
                division_id=int(teacher_row.class_division_id),
            )
        ]

    scopes = resolve_teacher_assignment_scopes(
        db, tenant_id=tenant_id, teacher_id=teacher_id
    )
    class_ids = sorted({scope.class_id for scope in scopes})
    if (
        not class_ids
        and teacher_row
        and teacher_row.class_id is not None
        and teacher_row.class_division_id is not None
    ):
        class_ids = [int(teacher_row.class_id)]
        scopes = (
            ClassDivisionScope(
                class_id=int(teacher_row.class_id),
                class_division_id=int(teacher_row.class_division_id),
                allowed_subject_ids=None,
            ),
        )
    classes: list[TeacherGalleryClassOption] = []

    for class_id in class_ids:
        class_row = (
            db.query(SchoolClass)
            .filter(
                SchoolClass.id == class_id,
                SchoolClass.tenant_id == tenant_id,
                SchoolClass.is_deleted == False,  # noqa: E712
            )
            .first()
        )
        if not class_row:
            continue

        allowed_division_ids: set[int] | None = set()
        include_all_divisions = False
        for scope in scopes:
            if scope.class_id != class_id:
                continue
            if scope.allowed_subject_ids is None:
                if scope.class_division_id is None:
                    include_all_divisions = True
                else:
                    allowed_division_ids.add(int(scope.class_division_id))
            elif scope.class_division_id is not None:
                allowed_division_ids.add(int(scope.class_division_id))

        if include_all_divisions:
            allowed_division_ids = None

        division_rows = homework_repository.get_divisions_for_teacher_class(
            db,
            tenant_id=tenant_id,
            user_id=user_id,
            class_id=class_id,
        )
        if allowed_division_ids is not None:
            division_rows = [
                row for row in division_rows if int(row["id"]) in allowed_division_ids
            ]

        classes.append(
            TeacherGalleryClassOption(
                id=int(class_row.id),
                name=str(class_row.name),
                divisions=[
                    TeacherGalleryClassDivision(
                        id=int(row["id"]),
                        division_name=str(row["division_name"]),
                    )
                    for row in division_rows
                ],
            )
        )

    return TeacherGalleryScopeResponse(
        is_teacher=True,
        default_targets=default_targets,
        classes=classes,
    )
    