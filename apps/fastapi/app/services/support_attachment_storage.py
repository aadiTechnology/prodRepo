from __future__ import annotations

import os
from datetime import datetime
from typing import Literal
from uuid import uuid4

from app.core.exceptions import ValidationException

FAQ_UPLOAD_DIR = os.path.join("static", "support-faq-attachments")
FAQ_ATTACHMENTS_URL_PREFIX = "/support-faq-attachments"

RELEASE_NOTE_UPLOAD_DIR = os.path.join("static", "support-release-notes")
RELEASE_NOTES_URL_PREFIX = "/support-release-notes"

FAQ_MAX_FILE_BYTES = 3 * 1024 * 1024
RELEASE_NOTE_MAX_FILE_BYTES = 10 * 1024 * 1024

FAQ_ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
}

RELEASE_NOTE_ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

FAQ_MIME_TO_EXT = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
}

RELEASE_NOTE_MIME_TO_EXT = {
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
}

RELEASE_NOTE_MIME_TO_TYPE = {
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
}

os.makedirs(FAQ_UPLOAD_DIR, exist_ok=True)
os.makedirs(RELEASE_NOTE_UPLOAD_DIR, exist_ok=True)


def _save_file(
    *,
    upload_dir: str,
    url_prefix: str,
    scope_prefix: str,
    file_name: str,
    content: bytes,
    content_type: str,
    allowed_mimes: set[str],
    mime_to_ext: dict[str, str],
    max_bytes: int,
    invalid_format_message: str,
) -> tuple[str, str]:
    if len(content) > max_bytes:
        raise ValidationException(
            f"File size exceeded. Maximum allowed size is {max_bytes // (1024 * 1024)} MB"
        )

    mime = (content_type or "").lower()
    if mime not in allowed_mimes:
        raise ValidationException(invalid_format_message)

    ext = mime_to_ext.get(mime) or os.path.splitext(file_name or "")[1].lower() or ".bin"
    unique_suffix = datetime.utcnow().strftime("%Y%m%d%H%M%S") + "_" + uuid4().hex[:8]
    safe_name = f"{scope_prefix}_{unique_suffix}{ext}"
    disk_path = os.path.join(upload_dir, safe_name)

    try:
        with open(disk_path, "wb") as buf:
            buf.write(content)
    except OSError as exc:
        raise ValidationException("File upload failed") from exc

    return f"{url_prefix}/{safe_name}", ext.lstrip(".")


def save_faq_attachment_file(
    *,
    tenant_id: int,
    faq_id: int,
    file_name: str,
    content: bytes,
    content_type: str,
) -> str:
    stored_path, _ = _save_file(
        upload_dir=FAQ_UPLOAD_DIR,
        url_prefix=FAQ_ATTACHMENTS_URL_PREFIX,
        scope_prefix=f"{tenant_id}_{faq_id}",
        file_name=file_name,
        content=content,
        content_type=content_type,
        allowed_mimes=FAQ_ALLOWED_MIME_TYPES,
        mime_to_ext=FAQ_MIME_TO_EXT,
        max_bytes=FAQ_MAX_FILE_BYTES,
        invalid_format_message="Invalid file format. Allowed: PDF, JPG, PNG",
    )
    return stored_path


def save_release_note_file(
    *,
    update_id: int,
    file_name: str,
    content: bytes,
    content_type: str,
) -> tuple[str, str]:
    stored_path, ext = _save_file(
        upload_dir=RELEASE_NOTE_UPLOAD_DIR,
        url_prefix=RELEASE_NOTES_URL_PREFIX,
        scope_prefix=f"update_{update_id}",
        file_name=file_name,
        content=content,
        content_type=content_type,
        allowed_mimes=RELEASE_NOTE_ALLOWED_MIME_TYPES,
        mime_to_ext=RELEASE_NOTE_MIME_TO_EXT,
        max_bytes=RELEASE_NOTE_MAX_FILE_BYTES,
        invalid_format_message="Invalid file format. Allowed: PDF, DOC, DOCX",
    )
    file_type = RELEASE_NOTE_MIME_TO_TYPE.get((content_type or "").lower(), ext)
    return stored_path, file_type


def disk_path_for_faq_attachment(file_path: str) -> str:
    filename = os.path.basename(file_path.strip().lstrip("/"))
    return os.path.join(FAQ_UPLOAD_DIR, filename)


def disk_path_for_release_note(file_path: str) -> str:
    filename = os.path.basename(file_path.strip().lstrip("/"))
    return os.path.join(RELEASE_NOTE_UPLOAD_DIR, filename)


def attachment_display_type(content_type: str) -> Literal["pdf", "image"]:
    if (content_type or "").lower() == "application/pdf":
        return "pdf"
    return "image"
