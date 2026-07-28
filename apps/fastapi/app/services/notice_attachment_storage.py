from __future__ import annotations

import os
from datetime import datetime
from uuid import uuid4

from app.core.exceptions import ValidationException
from app.services import azure_blob_service

NOTICE_ATTACHMENTS_PREFIX = "notice-attachments"
NOTICE_ATTACHMENTS_URL_PREFIX = "/notice-attachments"

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
    blob_name = azure_blob_service.extract_blob_name(trimmed)
    return (
        trimmed.startswith(f"{NOTICE_ATTACHMENTS_URL_PREFIX}/")
        or trimmed.startswith(f"{NOTICE_ATTACHMENTS_PREFIX}/")
        or trimmed.startswith("https://")
        or trimmed.startswith("http://")
        or (blob_name is not None and blob_name.startswith(f"{NOTICE_ATTACHMENTS_PREFIX}/"))
    )


def validate_attachment_path(file_path: str) -> str:
    """Ensure file_path is a short server/blob path, never embedded file content."""
    if not file_path:
        raise ValidationException("Invalid attachment path")

    trimmed = file_path.strip()
    if trimmed.startswith("data:"):
        raise ValidationException(
            "Attachments must be uploaded via the file upload endpoint"
        )

    blob_name = azure_blob_service.extract_blob_name(trimmed)
    if blob_name and blob_name.startswith(f"{NOTICE_ATTACHMENTS_PREFIX}/"):
        if len(blob_name) > 500:
            raise ValidationException("Invalid attachment path")
        return blob_name

    if len(trimmed) > 500:
        raise ValidationException("Invalid attachment path")
    if not is_stored_attachment_path(trimmed):
        raise ValidationException("Invalid attachment path")
    return trimmed.lstrip("/")


def save_notice_attachment_file(
    *,
    tenant_id: int,
    notice_id: int,
    file_name: str,
    content: bytes,
    content_type: str,
) -> str:
    """Upload attachment to Azure Blob Storage and return the stored blob name."""
    if len(content) > MAX_FILE_BYTES:
        raise ValidationException(
            "File size exceeded. Maximum allowed size is 3 MB"
        )

    mime = (content_type or "").lower()
    if mime not in ALLOWED_MIME_TYPES:
        raise ValidationException("Invalid file format. Allowed: PDF, JPG, PNG")

    if not azure_blob_service.is_azure_storage_configured():
        raise ValidationException("Azure Blob Storage is not configured")

    ext = MIME_TO_EXT.get(mime) or os.path.splitext(file_name or "")[1].lower() or ".bin"
    unique_suffix = datetime.utcnow().strftime("%Y%m%d%H%M%S") + "_" + uuid4().hex[:8]
    safe_name = f"{tenant_id}_{notice_id}_{unique_suffix}{ext}"
    blob_name = f"{NOTICE_ATTACHMENTS_PREFIX}/{safe_name}"

    return azure_blob_service.upload_bytes(
        blob_name=blob_name,
        content=content,
        content_type=mime,
    )


def resolve_attachment_url(file_path: str) -> str:
    """Return a frontend-usable download URL (SAS when available)."""
    return azure_blob_service.resolve_download_url(file_path)


def delete_notice_attachment_file(file_path: str) -> None:
    """Delete attachment from Azure (and best-effort legacy local disk)."""
    blob_name = azure_blob_service.extract_blob_name(file_path)
    if blob_name:
        azure_blob_service.delete_blob(blob_name)

    # Best-effort cleanup for legacy local files.
    disk_path = disk_path_for_attachment(file_path)
    if os.path.exists(disk_path):
        try:
            os.remove(disk_path)
        except OSError:
            pass


def disk_path_for_attachment(file_path: str) -> str:
    """Resolve legacy on-disk path for older notice attachments."""
    trimmed = file_path.strip().lstrip("/")
    filename = os.path.basename(trimmed)

    upload_dir = os.path.join("static", "notice-attachments")
    disk_path = os.path.join(upload_dir, filename)
    if os.path.exists(disk_path):
        return disk_path

    legacy_uploads_path = os.path.join("static", "uploads", "notice-attachments", filename)
    if os.path.exists(legacy_uploads_path):
        return legacy_uploads_path

    return os.path.join("static", trimmed)
