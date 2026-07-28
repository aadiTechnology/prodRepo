from __future__ import annotations

import os
from datetime import datetime
from uuid import uuid4

from app.core.exceptions import ValidationException
from app.services import azure_blob_service

HOMEWORK_ATTACHMENTS_PREFIX = "homework-attachments"

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".pdf", ".doc", ".docx", ".txt"}
MAX_FILE_SIZE_MB = 10
MAX_FILE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024


def save_homework_attachment_file(
    *,
    tenant_id: int,
    homework_id: int,
    file_name: str,
    content: bytes,
    content_type: str | None = None,
) -> str:
    """Upload homework attachment to Azure Blob Storage and return blob name."""
    extension = os.path.splitext(file_name or "")[1].lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise ValidationException(
            "Invalid file format. Allowed: images, PDF, Word, text files"
        )

    if len(content) > MAX_FILE_BYTES:
        raise ValidationException(
            f"File size exceeded. Maximum allowed size is {MAX_FILE_SIZE_MB} MB"
        )

    if not azure_blob_service.is_azure_storage_configured():
        raise ValidationException("Azure Blob Storage is not configured")

    unique_suffix = datetime.utcnow().strftime("%Y%m%d%H%M%S") + "_" + uuid4().hex[:8]
    safe_name = f"{tenant_id}_{homework_id}_{unique_suffix}{extension}"
    blob_name = f"{HOMEWORK_ATTACHMENTS_PREFIX}/{safe_name}"

    return azure_blob_service.upload_bytes(
        blob_name=blob_name,
        content=content,
        content_type=content_type or "application/octet-stream",
    )


def resolve_attachment_url(file_path: str) -> str:
    """Return a frontend-usable download URL (SAS when available)."""
    return azure_blob_service.resolve_download_url(file_path)


def delete_homework_attachment_file(file_path: str) -> None:
    """Delete attachment from Azure (and best-effort legacy local disk)."""
    blob_name = azure_blob_service.extract_blob_name(file_path)
    if blob_name:
        azure_blob_service.delete_blob(blob_name)

    disk_path = disk_path_for_attachment(file_path)
    if os.path.exists(disk_path):
        try:
            os.remove(disk_path)
        except OSError:
            pass


def disk_path_for_attachment(file_path: str) -> str:
    """Resolve legacy on-disk path for older homework attachments."""
    trimmed = (file_path or "").strip().lstrip("/")
    if trimmed.startswith("attachments/"):
        trimmed = trimmed[len("attachments/") :]
    filename = os.path.basename(trimmed)
    return os.path.join("static", "homework-attachments", filename)
