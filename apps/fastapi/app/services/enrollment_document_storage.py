from __future__ import annotations

import logging
import os
from datetime import datetime
from uuid import uuid4

from app.core.exceptions import ValidationException
from app.services.blob_storage_factory import (
    get_active_provider_name,
    delete_mixed_blob,
    download_mixed_bytes,
    extract_object_name,
    get_storage_service,
    resolve_mixed_download_url,
)
from app.services.image_compression_service import prepare_file_for_storage

logger = logging.getLogger(__name__)

ENROLLMENT_DOCUMENTS_PREFIX = "enrollment-documents"
STUDENT_PHOTOS_PREFIX = "student-photos"
ENROLLMENT_DOCUMENTS_URL_PREFIX = "/enrollment-documents"

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_BIRTH_CERTIFICATE_EXTENSIONS = ALLOWED_IMAGE_EXTENSIONS | {".pdf"}

MAX_FILE_SIZE_MB = 10
MAX_FILE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

_CLOUD_PREFIXES = (ENROLLMENT_DOCUMENTS_PREFIX, STUDENT_PHOTOS_PREFIX)


def is_enrollment_document_path(file_path: str | None) -> bool:
    trimmed = (file_path or "").strip()
    if not trimmed:
        return False
    blob_name = extract_object_name(trimmed)
    if blob_name and blob_name.startswith(tuple(f"{prefix}/" for prefix in _CLOUD_PREFIXES)):
        return True
    path_only = trimmed.split("?", 1)[0].lstrip("/")
    return any(path_only.startswith(f"{prefix}/") for prefix in _CLOUD_PREFIXES)


def persistable_document_path(file_path: str | None) -> str | None:
    """Store a short blob/legacy path, never a time-limited signed URL."""
    if not file_path or not str(file_path).strip():
        return None

    trimmed = str(file_path).strip()
    if trimmed.startswith("data:"):
        raise ValidationException("Documents must be uploaded via the file upload endpoint")

    blob_name = extract_object_name(trimmed)
    if blob_name and blob_name.startswith(tuple(f"{prefix}/" for prefix in _CLOUD_PREFIXES)):
        return blob_name

    return trimmed


def save_enrollment_document_file(
    *,
    tenant_id: int,
    user_id: int,
    document_type: str,
    file_name: str,
    content: bytes,
    content_type: str | None = None,
) -> str:
    """Upload an enrollment document via the active storage provider and return the blob name."""
    extension = os.path.splitext(file_name or "")[1].lower()
    allowed = (
        ALLOWED_BIRTH_CERTIFICATE_EXTENSIONS
        if document_type == "birth_certificate"
        else ALLOWED_IMAGE_EXTENSIONS
    )
    if extension not in allowed:
        raise ValidationException(f"Invalid file type for {document_type}")

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
    safe_name = f"{tenant_id}_{user_id}_{document_type}_{unique_suffix}{stored_ext}"
    prefix = STUDENT_PHOTOS_PREFIX if document_type == "photo" else ENROLLMENT_DOCUMENTS_PREFIX
    blob_name = f"{prefix}/{safe_name}"

    return storage.upload_bytes(
        blob_name=blob_name,
        content=stored,
        content_type=stored_type or content_type or "application/octet-stream",
    )


def resolve_uploaded_document_url(blob_name: str) -> str:
    """Build a download URL for a blob that was just uploaded to the active provider."""
    trimmed = (blob_name or "").strip()
    if not trimmed:
        return trimmed

    storage = get_storage_service()
    try:
        if get_active_provider_name() == "backblaze":
            return storage.generate_authorized_download_url(trimmed)
        return storage.generate_sas_url(trimmed)
    except Exception:
        logger.exception("Failed to generate download URL for %s", trimmed)
        try:
            return storage.resolve_download_url(trimmed)
        except Exception:
            return f"/{trimmed}" if not trimmed.startswith("/") else trimmed


def resolve_document_url(file_path: str | None) -> str | None:
    """Return a frontend-usable URL (Azure SAS, B2 authorized URL, or legacy static path)."""
    if not file_path or not str(file_path).strip():
        return None

    trimmed = str(file_path).strip()
    path_only = trimmed.split("?", 1)[0]
    if path_only.startswith("/profile-images/"):
        return trimmed

    resolved = resolve_mixed_download_url(trimmed)
    if resolved.startswith("http://") or resolved.startswith("https://"):
        return resolved

    legacy = resolved.lstrip("/")
    if any(legacy.startswith(f"{prefix}/") for prefix in _CLOUD_PREFIXES):
        return f"/{legacy}"
    return resolved if resolved.startswith("/") else trimmed


def download_enrollment_document_bytes(file_path: str) -> bytes:
    trimmed = (file_path or "").strip()
    if not trimmed:
        raise ValidationException("Invalid document path")

    blob_name = extract_object_name(trimmed)
    if blob_name and blob_name.startswith(tuple(f"{prefix}/" for prefix in _CLOUD_PREFIXES)):
        try:
            return download_mixed_bytes(trimmed)
        except Exception:
            pass

    disk_path = disk_path_for_document(trimmed)
    if os.path.isfile(disk_path):
        with open(disk_path, "rb") as handle:
            return handle.read()

    raise ValidationException("File not found")


def delete_enrollment_document_file(file_path: str) -> None:
    delete_mixed_blob(file_path)

    disk_path = disk_path_for_document(file_path)
    if os.path.exists(disk_path):
        try:
            os.remove(disk_path)
        except OSError:
            pass


def disk_path_for_document(file_path: str) -> str:
    trimmed = (file_path or "").strip().lstrip("/")
    filename = os.path.basename(trimmed)
    folder = STUDENT_PHOTOS_PREFIX if trimmed.startswith(f"{STUDENT_PHOTOS_PREFIX}/") else ENROLLMENT_DOCUMENTS_PREFIX
    return os.path.join("static", folder, filename)
