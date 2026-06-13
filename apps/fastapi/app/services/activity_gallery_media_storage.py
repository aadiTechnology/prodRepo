from __future__ import annotations

import os
from datetime import datetime
from uuid import uuid4

from app.core.exceptions import ValidationException

UPLOAD_DIR = os.path.join("static", "activity-gallery-media")
os.makedirs(UPLOAD_DIR, exist_ok=True)

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


def persist_gallery_media_file(
    *,
    tenant_id: int,
    gallery_id: int,
    original_filename: str,
    content: bytes,
    media_type: str,
    content_type: str | None = None,
) -> tuple[str, str]:
    extension = validate_media_file(
        filename=original_filename,
        content=content,
        media_type=media_type,
        content_type=content_type,
    )
    unique_suffix = datetime.utcnow().strftime("%Y%m%d%H%M%S") + "_" + uuid4().hex[:8]
    safe_name = f"{tenant_id}_{gallery_id}_{unique_suffix}{extension}"
    disk_path = os.path.join(UPLOAD_DIR, safe_name)

    try:
        with open(disk_path, "wb") as buf:
            buf.write(content)
    except OSError as exc:
        raise ValidationException("Unable to upload file. Please try again.") from exc

    return safe_name, f"/activity-gallery-media/{safe_name}"
