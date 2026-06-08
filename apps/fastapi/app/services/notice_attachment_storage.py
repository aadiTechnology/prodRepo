from __future__ import annotations

import os
from datetime import datetime
from uuid import uuid4

from app.core.exceptions import ValidationException
from app.core.upload_paths import (
    NOTICE_ATTACHMENTS_URL_PREFIX,
    disk_path_for_public_attachment_path,
    notice_attachment_public_path,
    notice_attachments_dir,
)

MAX_FILE_BYTES = 3 * 1024 * 1024

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
}

MIME_TO_EXT = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
}


def is_stored_attachment_path(file_path: str) -> bool:
    trimmed = file_path.strip()
    return (
        trimmed.startswith(f"{NOTICE_ATTACHMENTS_URL_PREFIX}/")
        or trimmed.startswith("https://")
        or trimmed.startswith("http://")
    )


def validate_attachment_path(file_path: str) -> str:
    """Ensure file_path is a short server URL/path, never embedded file content."""
    if not file_path:
        raise ValidationException("Invalid attachment path")

    trimmed = file_path.strip()
    if trimmed.startswith("data:"):
        raise ValidationException(
            "Attachments must be uploaded via the file upload endpoint"
        )
    if len(trimmed) > 500:
        raise ValidationException("Invalid attachment path")
    if not is_stored_attachment_path(trimmed):
        raise ValidationException("Invalid attachment path")
    return trimmed


def save_notice_attachment_file(
    *,
    tenant_id: int,
    notice_id: int,
    file_name: str,
    content: bytes,
    content_type: str,
) -> str:
    """Persist uploaded bytes to disk and return the public relative path."""
    if len(content) > MAX_FILE_BYTES:
        raise ValidationException(
            "File size exceeded. Maximum allowed size is 3 MB"
        )

    mime = (content_type or "").lower()
    if mime not in ALLOWED_MIME_TYPES:
        raise ValidationException("Invalid file format. Allowed: PDF, JPG, PNG")

    ext = MIME_TO_EXT.get(mime) or os.path.splitext(file_name or "")[1].lower() or ".bin"
    unique_suffix = datetime.utcnow().strftime("%Y%m%d%H%M%S") + "_" + uuid4().hex[:8]
    safe_name = f"{tenant_id}_{notice_id}_{unique_suffix}{ext}"
    disk_path = os.path.join(notice_attachments_dir(), safe_name)

    try:
        with open(disk_path, "wb") as buf:
            buf.write(content)
    except OSError as exc:
        raise ValidationException("File upload failed") from exc

    return notice_attachment_public_path(safe_name)


def disk_path_for_attachment(file_path: str) -> str:
    return disk_path_for_public_attachment_path(file_path)
