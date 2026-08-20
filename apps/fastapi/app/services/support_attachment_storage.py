from __future__ import annotations

import os
from datetime import datetime
from uuid import uuid4

from app.core.exceptions import ValidationException
from app.services import azure_blob_service
from app.services.image_compression_service import prepare_file_for_storage

QUERY_ATTACHMENTS_PREFIX = "support-query-attachments"
QUERY_UPLOAD_DIR = os.path.join("static", "support-query-attachments")

RELEASE_NOTES_PREFIX = "support-release-notes"
RELEASE_NOTE_UPLOAD_DIR = os.path.join("static", "support-release-notes")

QUERY_MAX_FILE_BYTES = 10 * 1024 * 1024
RELEASE_NOTE_MAX_FILE_BYTES = 10 * 1024 * 1024

QUERY_ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg"}
RELEASE_NOTE_ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx"}

RELEASE_NOTE_EXT_TO_TYPE = {
    ".pdf": "pdf",
    ".doc": "doc",
    ".docx": "docx",
}


def save_query_attachment_file(
    *,
    tenant_id: int,
    query_id: int,
    file_name: str,
    content: bytes,
    content_type: str | None = None,
) -> tuple[str, str]:
    extension = os.path.splitext(file_name or "")[1].lower()
    if extension not in QUERY_ALLOWED_EXTENSIONS:
        raise ValidationException(
            "Please upload a valid file. Allowed file types: PDF, DOC, DOCX, JPG, JPEG, PNG."
        )

    if len(content) > QUERY_MAX_FILE_BYTES:
        raise ValidationException("File size exceeded. Maximum allowed size is 10 MB")

    if not azure_blob_service.is_azure_storage_configured():
        raise ValidationException("Azure Blob Storage is not configured")

    stored_bytes, stored_type, stored_ext = prepare_file_for_storage(
        file_name=file_name,
        content=content,
        content_type=content_type,
        max_bytes=QUERY_MAX_FILE_BYTES,
    )
    unique_suffix = datetime.utcnow().strftime("%Y%m%d%H%M%S") + "_" + uuid4().hex[:8]
    safe_name = f"{tenant_id}_{query_id}_{unique_suffix}{stored_ext}"
    blob_name = f"{QUERY_ATTACHMENTS_PREFIX}/{safe_name}"

    stored = azure_blob_service.upload_bytes(
        blob_name=blob_name,
        content=stored_bytes,
        content_type=stored_type or content_type or "application/octet-stream",
    )
    file_type = stored_ext.lstrip(".")
    return stored, file_type


def save_release_note_file(
    *,
    note_id: int,
    file_name: str,
    content: bytes,
    content_type: str | None = None,
) -> tuple[str, str]:
    extension = os.path.splitext(file_name or "")[1].lower()
    if extension not in RELEASE_NOTE_ALLOWED_EXTENSIONS:
        raise ValidationException("Invalid file type. Allowed: PDF, DOC, DOCX")

    if len(content) > RELEASE_NOTE_MAX_FILE_BYTES:
        raise ValidationException("File size exceeded. Maximum allowed size is 10 MB")

    if not azure_blob_service.is_azure_storage_configured():
        raise ValidationException("Azure Blob Storage is not configured")

    unique_suffix = datetime.utcnow().strftime("%Y%m%d%H%M%S") + "_" + uuid4().hex[:8]
    safe_name = f"note_{note_id}_{unique_suffix}{extension}"
    blob_name = f"{RELEASE_NOTES_PREFIX}/{safe_name}"

    stored = azure_blob_service.upload_bytes(
        blob_name=blob_name,
        content=content,
        content_type=content_type or "application/octet-stream",
    )
    file_type = RELEASE_NOTE_EXT_TO_TYPE.get(extension, extension.lstrip("."))
    return stored, file_type


def resolve_attachment_url(file_path: str | None) -> str | None:
    if not file_path:
        return None
    return azure_blob_service.resolve_download_url(file_path)


def delete_support_file(file_path: str, *, legacy_upload_dir: str) -> None:
    blob_name = azure_blob_service.extract_blob_name(file_path)
    if blob_name:
        azure_blob_service.delete_blob(blob_name)

    filename = os.path.basename(file_path.strip().lstrip("/"))
    disk_path = os.path.join(legacy_upload_dir, filename)
    if os.path.exists(disk_path):
        try:
            os.remove(disk_path)
        except OSError:
            pass


def delete_query_attachment_file(file_path: str) -> None:
    delete_support_file(file_path, legacy_upload_dir=QUERY_UPLOAD_DIR)


def delete_release_note_file(file_path: str) -> None:
    delete_support_file(file_path, legacy_upload_dir=RELEASE_NOTE_UPLOAD_DIR)
