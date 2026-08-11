from __future__ import annotations

import os
from datetime import datetime
from typing import Literal
from uuid import uuid4

from app.core.exceptions import ValidationException
from app.services import azure_blob_service

FAQ_ATTACHMENTS_PREFIX = "support-faq-attachments"
FAQ_ATTACHMENTS_URL_PREFIX = "/support-faq-attachments"
FAQ_UPLOAD_DIR = os.path.join("static", "support-faq-attachments")

RELEASE_NOTES_PREFIX = "support-release-notes"
RELEASE_NOTES_URL_PREFIX = "/support-release-notes"
RELEASE_NOTE_UPLOAD_DIR = os.path.join("static", "support-release-notes")

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


def save_faq_attachment_file(
    *,
    tenant_id: int,
    faq_id: int,
    file_name: str,
    content: bytes,
    content_type: str,
) -> str:
    """Upload FAQ attachment to Azure Blob Storage and return the stored blob name."""
    if len(content) > FAQ_MAX_FILE_BYTES:
        raise ValidationException(
            "File size exceeded. Maximum allowed size is 3 MB"
        )

    mime = (content_type or "").lower()
    if mime not in FAQ_ALLOWED_MIME_TYPES:
        raise ValidationException("Invalid file format. Allowed: PDF, JPG, PNG")

    if not azure_blob_service.is_azure_storage_configured():
        raise ValidationException("Azure Blob Storage is not configured")

    ext = FAQ_MIME_TO_EXT.get(mime) or os.path.splitext(file_name or "")[1].lower() or ".bin"
    unique_suffix = datetime.utcnow().strftime("%Y%m%d%H%M%S") + "_" + uuid4().hex[:8]
    safe_name = f"{tenant_id}_{faq_id}_{unique_suffix}{ext}"
    blob_name = f"{FAQ_ATTACHMENTS_PREFIX}/{safe_name}"

    return azure_blob_service.upload_bytes(
        blob_name=blob_name,
        content=content,
        content_type=mime,
    )


def save_release_note_file(
    *,
    update_id: int,
    file_name: str,
    content: bytes,
    content_type: str,
) -> tuple[str, str]:
    """Upload release note to Azure Blob Storage and return (blob_name, file_type)."""
    if len(content) > RELEASE_NOTE_MAX_FILE_BYTES:
        raise ValidationException(
            "File size exceeded. Maximum allowed size is 10 MB"
        )

    mime = (content_type or "").lower()
    if mime not in RELEASE_NOTE_ALLOWED_MIME_TYPES:
        raise ValidationException("Invalid file format. Allowed: PDF, DOC, DOCX")

    if not azure_blob_service.is_azure_storage_configured():
        raise ValidationException("Azure Blob Storage is not configured")

    ext = RELEASE_NOTE_MIME_TO_EXT.get(mime) or os.path.splitext(file_name or "")[1].lower() or ".bin"
    unique_suffix = datetime.utcnow().strftime("%Y%m%d%H%M%S") + "_" + uuid4().hex[:8]
    safe_name = f"update_{update_id}_{unique_suffix}{ext}"
    blob_name = f"{RELEASE_NOTES_PREFIX}/{safe_name}"

    stored = azure_blob_service.upload_bytes(
        blob_name=blob_name,
        content=content,
        content_type=mime,
    )
    file_type = RELEASE_NOTE_MIME_TO_TYPE.get(mime, ext.lstrip("."))
    return stored, file_type


def resolve_attachment_url(file_path: str) -> str:
    """Return a frontend-usable download URL (SAS when available)."""
    return azure_blob_service.resolve_download_url(file_path)


def delete_support_file(file_path: str, *, legacy_upload_dir: str) -> None:
    """Delete attachment from Azure (and best-effort legacy local disk)."""
    blob_name = azure_blob_service.extract_blob_name(file_path)
    if blob_name:
        azure_blob_service.delete_blob(blob_name)

    disk_path = _legacy_disk_path(file_path, legacy_upload_dir)
    if os.path.exists(disk_path):
        try:
            os.remove(disk_path)
        except OSError:
            pass


def delete_faq_attachment_file(file_path: str) -> None:
    delete_support_file(file_path, legacy_upload_dir=FAQ_UPLOAD_DIR)


def delete_release_note_file(file_path: str) -> None:
    delete_support_file(file_path, legacy_upload_dir=RELEASE_NOTE_UPLOAD_DIR)


def disk_path_for_faq_attachment(file_path: str) -> str:
    return _legacy_disk_path(file_path, FAQ_UPLOAD_DIR)


def disk_path_for_release_note(file_path: str) -> str:
    return _legacy_disk_path(file_path, RELEASE_NOTE_UPLOAD_DIR)


def _legacy_disk_path(file_path: str, upload_dir: str) -> str:
    filename = os.path.basename(file_path.strip().lstrip("/"))
    return os.path.join(upload_dir, filename)


def attachment_display_type(content_type: str) -> Literal["pdf", "image"]:
    if (content_type or "").lower() == "application/pdf":
        return "pdf"
    return "image"
