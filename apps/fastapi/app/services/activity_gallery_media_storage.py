from __future__ import annotations

import os
from datetime import datetime
from uuid import uuid4

from app.core.exceptions import ValidationException

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

    if media_type == "Video":
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
    extension = validate_media_file(
        filename=original_filename,
        content=content,
        media_type="Photo",
        content_type=content_type,
    )
    unique_suffix = datetime.utcnow().strftime("%Y%m%d%H%M%S") + "_" + uuid4().hex[:8]
    return f"{tenant_id}_{gallery_id}_{unique_suffix}{extension}"


def gallery_media_content_path(*, gallery_id: int, media_id: int) -> str:
    return f"/api/activity-galleries/{gallery_id}/media/{media_id}/content"


def mime_type_for_file_name(file_name: str) -> str:
    extension = os.path.splitext(file_name or "")[1].lower()
    return EXTENSION_TO_MIME.get(extension, "application/octet-stream")


def is_db_stored_media_path(file_path: str) -> bool:
    return file_path.strip().startswith("/api/activity-galleries/")


def legacy_disk_path(file_path: str) -> str:
    return os.path.join("static", file_path.lstrip("/"))
