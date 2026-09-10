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
from app.services.image_compression_service import prepare_file_for_storage

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


def is_backblaze_hosted_attachment(file_path: str) -> bool:
    """
    True when the attachment object exists on Backblaze.

    Used so STORAGE_PROVIDER=backblaze does not force Azure-only legacy rows
    through the private B2 content proxy.
    """
    if looks_like_azure_blob_url(file_path):
        return False
    blob_name = extract_object_name(file_path)
    if not blob_name or not blob_name.startswith(f"{NOTICE_ATTACHMENTS_PREFIX}/"):
        return False
    return locate_object_provider(file_path) == "backblaze"


def is_stored_attachment_path(file_path: str) -> bool:
    trimmed = file_path.strip()
    blob_name = extract_object_name(trimmed)
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

    blob_name = extract_object_name(trimmed)
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
    """Upload attachment to the configured storage provider and return the blob name."""
    if len(content) > MAX_FILE_BYTES:
        raise ValidationException(
            "File size exceeded. Maximum allowed size is 3 MB"
        )

    mime = (content_type or "").lower()
    if mime not in ALLOWED_MIME_TYPES:
        raise ValidationException("Invalid file format. Allowed: PDF, JPG, PNG")

    storage = get_storage_service()
    if not storage.is_storage_configured():
        raise ValidationException("File storage is not configured")

    stored, stored_type, ext = prepare_file_for_storage(
        file_name=file_name,
        content=content,
        content_type=mime,
        max_bytes=MAX_FILE_BYTES,
    )
    unique_suffix = datetime.utcnow().strftime("%Y%m%d%H%M%S") + "_" + uuid4().hex[:8]
    safe_name = f"{tenant_id}_{notice_id}_{unique_suffix}{ext}"
    blob_name = f"{NOTICE_ATTACHMENTS_PREFIX}/{safe_name}"

    return storage.upload_bytes(
        blob_name=blob_name,
        content=stored,
        content_type=stored_type or mime,
    )


def resolve_attachment_url(file_path: str) -> str:
    """Return a secure frontend-usable download URL (Azure SAS or B2 authorized URL)."""
    return resolve_mixed_download_url(file_path)


def download_notice_attachment_bytes(file_path: str) -> bytes:
    """
    Download notice attachment bytes from the provider that hosts the object.

    Falls back to legacy on-disk files when the path is not a cloud blob.
    """
    trimmed = (file_path or "").strip()
    if not trimmed:
        raise ValidationException("Invalid attachment path")

    blob_name = extract_object_name(trimmed)
    if blob_name and blob_name.startswith(f"{NOTICE_ATTACHMENTS_PREFIX}/"):
        return download_mixed_bytes(trimmed)

    disk_path = disk_path_for_attachment(trimmed)
    if os.path.isfile(disk_path):
        with open(disk_path, "rb") as handle:
            return handle.read()

    raise ValidationException("File not found")


def delete_notice_attachment_file(file_path: str) -> None:
    """Delete attachment from the hosting provider (and best-effort legacy local disk)."""
    delete_mixed_blob(file_path)

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
