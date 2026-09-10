from __future__ import annotations

import os
from datetime import datetime
from uuid import uuid4

from app.core.exceptions import ValidationException
from app.services.blob_storage_factory import (
    delete_mixed_blob,
    download_mixed_bytes,
    extract_object_name,
    get_storage_service,
    locate_object_provider,
    looks_like_azure_blob_url,
    resolve_mixed_download_url,
)
from app.services.image_compression_service import (
    JPEG_CONTENT_TYPE,
    MAX_ORIGINAL_IMAGE_BYTES,
    compress_image_to_jpeg,
)

GALLERY_MEDIA_PREFIX = "activity-gallery-media"

PHOTO_EXTENSIONS = {".jpg", ".jpeg", ".png", ".jfif"}
VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi"}
MAX_FILE_SIZE_MB = 50

CONTENT_TYPE_TO_EXTENSION = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/jfif": ".jfif",
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
    "video/x-msvideo": ".avi",
}

EXTENSION_TO_MIME = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".jfif": "image/jpeg",
}


def _resolve_extension(*, filename: str, content_type: str | None, media_type: str) -> str:
    extension = os.path.splitext(filename or "")[1].lower()
    if extension:
        return extension
    if content_type:
        mapped = CONTENT_TYPE_TO_EXTENSION.get(content_type.lower().split(";")[0].strip())
        if mapped:
            return mapped
    return ""


def validate_media_file(
    *,
    filename: str,
    content: bytes,
    media_type: str,
    content_type: str | None = None,
) -> str:
    extension = _resolve_extension(filename=filename, content_type=content_type, media_type=media_type)
    allowed = PHOTO_EXTENSIONS if media_type == "Photo" else VIDEO_EXTENSIONS
    if extension not in allowed:
        raise ValidationException(
            "Invalid file format. Allowed: JPG, JPEG, PNG, JFIF for photos; MP4, AVI, MOV for videos"
        )

    if media_type == "Photo":
        if len(content) > MAX_ORIGINAL_IMAGE_BYTES:
            raise ValidationException("Image size must not exceed 4 MB")
    elif media_type == "Video":
        size_mb = len(content) / (1024 * 1024)
        if size_mb > MAX_FILE_SIZE_MB:
            raise ValidationException(
                f"File size exceeded. Maximum allowed size is {MAX_FILE_SIZE_MB} MB"
            )

    return extension


def build_gallery_photo_file_name(
    *,
    tenant_id: int,
    gallery_id: int,
    original_filename: str,
    content: bytes,
    content_type: str | None = None,
) -> str:
    validate_media_file(
        filename=original_filename,
        content=content,
        media_type="Photo",
        content_type=content_type,
    )
    unique_suffix = datetime.utcnow().strftime("%Y%m%d%H%M%S") + "_" + uuid4().hex[:8]
    return f"{tenant_id}_{gallery_id}_{unique_suffix}.jpg"


def save_gallery_photo_file(
    *,
    tenant_id: int,
    gallery_id: int,
    original_filename: str,
    content: bytes,
    content_type: str | None = None,
) -> tuple[str, str, bytes]:
    """
    Upload a gallery photo via the active storage provider.

    Returns (blob_name, safe_file_name, stored_bytes).
    """
    storage = get_storage_service()
    if not storage.is_storage_configured():
        raise ValidationException("File storage is not configured")

    validate_media_file(
        filename=original_filename,
        content=content,
        media_type="Photo",
        content_type=content_type,
    )
    stored_bytes = compress_image_to_jpeg(content)
    safe_name = build_gallery_photo_file_name(
        tenant_id=tenant_id,
        gallery_id=gallery_id,
        original_filename=original_filename,
        content=stored_bytes,
        content_type=JPEG_CONTENT_TYPE,
    )
    blob_name = f"{GALLERY_MEDIA_PREFIX}/{safe_name}"

    storage.upload_bytes(
        blob_name=blob_name,
        content=stored_bytes,
        content_type=JPEG_CONTENT_TYPE,
    )
    return blob_name, safe_name, stored_bytes


def gallery_media_content_path(*, gallery_id: int, media_id: int) -> str:
    return f"/api/activity-galleries/{gallery_id}/media/{media_id}/content"


def mime_type_for_file_name(file_name: str) -> str:
    extension = os.path.splitext(file_name or "")[1].lower()
    return EXTENSION_TO_MIME.get(extension, "application/octet-stream")


def is_db_stored_media_path(file_path: str) -> bool:
    return file_path.strip().startswith("/api/activity-galleries/")


def is_gallery_cloud_media_path(file_path: str) -> bool:
    blob_name = extract_object_name(file_path or "")
    return bool(blob_name and blob_name.startswith(f"{GALLERY_MEDIA_PREFIX}/"))


# Backward-compatible alias used by activity_gallery_service.
def is_azure_gallery_media_path(file_path: str) -> bool:
    return is_gallery_cloud_media_path(file_path)


def is_backblaze_hosted_gallery_media(file_path: str) -> bool:
    """True when a gallery media object lives on private Backblaze."""
    if looks_like_azure_blob_url(file_path):
        return False
    if not is_gallery_cloud_media_path(file_path):
        return False
    return locate_object_provider(file_path) == "backblaze"


def resolve_media_url(file_path: str) -> str:
    """
    Return a frontend-usable URL.

    - Cloud gallery blob paths -> Azure SAS or B2 authorized URL
    - YouTube / external https URLs -> unchanged
    - Legacy /content API paths -> unchanged (frontend fetches with auth)

    Prefer gallery_media_content_path() for Backblaze-hosted photos so the
    private bucket is accessed via the authenticated /content proxy.
    """
    trimmed = (file_path or "").strip()
    if not trimmed:
        return trimmed
    if is_db_stored_media_path(trimmed):
        return trimmed
    if trimmed.startswith(("http://", "https://")) and not is_gallery_cloud_media_path(trimmed):
        # External links (YouTube, etc.) — do not rewrite.
        if not looks_like_azure_blob_url(trimmed):
            return trimmed
    return resolve_mixed_download_url(trimmed)


def delete_gallery_media_file(file_path: str) -> None:
    """Delete cloud blob when path points to gallery media; ignore YouTube/legacy paths."""
    trimmed = (file_path or "").strip()
    if not trimmed or is_db_stored_media_path(trimmed):
        return
    if trimmed.startswith(("http://", "https://")) and not looks_like_azure_blob_url(trimmed):
        if not is_gallery_cloud_media_path(trimmed):
            return

    if is_gallery_cloud_media_path(trimmed):
        delete_mixed_blob(trimmed)

    disk_path = legacy_disk_path(trimmed)
    if os.path.exists(disk_path):
        try:
            os.remove(disk_path)
        except OSError:
            pass


def download_gallery_media_bytes(file_path: str) -> bytes | None:
    """Download bytes from Azure/B2 when path is a gallery blob; otherwise None."""
    if not is_gallery_cloud_media_path(file_path):
        return None
    try:
        return download_mixed_bytes(file_path)
    except ValidationException:
        return None


def legacy_disk_path(file_path: str) -> str:
    return os.path.join("static", file_path.lstrip("/"))
