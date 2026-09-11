from __future__ import annotations

import os
from datetime import datetime
from uuid import uuid4

from app.core.exceptions import ValidationException
from app.services.blob_storage_factory import (
    delete_mixed_blob,
    get_storage_service,
    resolve_mixed_download_url,
)
from app.services.image_compression_service import prepare_file_for_storage

SYLLABUS_ATTACHMENTS_PREFIX = "syllabus-attachments"

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
    ".jpg",
    ".jpeg",
    ".png",
}

MAX_FILE_SIZE_MB = 10
MAX_FILE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024


def save_syllabus_attachment_file(
    *,
    tenant_id: int,
    syllabus_id: int,
    file_name: str,
    content: bytes,
    content_type: str | None = None,
) -> str:
    """Upload syllabus attachment via the active storage provider and return blob name."""
    extension = os.path.splitext(file_name or "")[1].lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise ValidationException(
            "Invalid file type. Allowed: pdf, doc, docx, xls, xlsx, ppt, pptx, jpg, jpeg, png"
        )

    if len(content) > MAX_FILE_BYTES:
        raise ValidationException(
            f"File size exceeded. Maximum allowed size is {MAX_FILE_SIZE_MB} MB"
        )

    storage = get_storage_service()
    if not storage.is_storage_configured():
        raise ValidationException("File storage is not configured")

    stored, stored_type, stored_ext = prepare_file_for_storage(
        file_name=file_name,
        content=content,
        content_type=content_type,
        max_bytes=MAX_FILE_BYTES,
    )
    unique_suffix = datetime.utcnow().strftime("%Y%m%d%H%M%S") + "_" + uuid4().hex[:8]
    safe_name = f"{tenant_id}_{syllabus_id}_{unique_suffix}{stored_ext}"
    blob_name = f"{SYLLABUS_ATTACHMENTS_PREFIX}/{safe_name}"

    return storage.upload_bytes(
        blob_name=blob_name,
        content=stored,
        content_type=stored_type or content_type or "application/octet-stream",
    )


def resolve_attachment_url(file_path: str) -> str:
    """Return a secure frontend-usable download URL (Azure SAS or B2 authorized URL)."""
    return resolve_mixed_download_url(file_path)


def delete_syllabus_attachment_file(file_path: str) -> None:
    """Delete attachment from the provider that hosts it (plus legacy local disk)."""
    delete_mixed_blob(file_path)

    disk_path = disk_path_for_attachment(file_path)
    if os.path.exists(disk_path):
        try:
            os.remove(disk_path)
        except OSError:
            pass


def disk_path_for_attachment(file_path: str) -> str:
    """Resolve legacy on-disk path for older syllabus attachments."""
    trimmed = (file_path or "").strip().lstrip("/")
    filename = os.path.basename(trimmed)
    return os.path.join("static", "syllabus-attachments", filename)
