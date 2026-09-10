from __future__ import annotations

import os
from datetime import datetime
from uuid import uuid4

from app.core.config import settings
from app.core.exceptions import ValidationException
from app.services.blob_storage_factory import get_storage_service
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


def _looks_like_azure_blob_url(file_path: str) -> bool:
    return "blob.core.windows.net" in (file_path or "").lower()


def _active_provider() -> str:
    return (settings.STORAGE_PROVIDER or "azure").lower()


def _notice_blob_name(file_path: str) -> str | None:
    """Normalize a stored path to a notice-attachments blob name, if applicable."""
    trimmed = (file_path or "").strip()
    if not trimmed:
        return None

    # Prefer Azure URL parsing when the stored value is clearly an Azure blob URL,
    # even if STORAGE_PROVIDER is currently backblaze.
    if _looks_like_azure_blob_url(trimmed):
        from app.services import azure_blob_service

        blob_name = azure_blob_service.extract_blob_name(trimmed)
    else:
        blob_name = get_storage_service().extract_blob_name(trimmed)

    if blob_name and blob_name.startswith(f"{NOTICE_ATTACHMENTS_PREFIX}/"):
        return blob_name
    return None


def is_backblaze_hosted_attachment(file_path: str) -> bool:
    """
    True when the attachment object exists on Backblaze.

    Used so STORAGE_PROVIDER=backblaze does not force Azure-only legacy rows
    through the private B2 content proxy.
    """
    if _looks_like_azure_blob_url(file_path):
        return False
    if _active_provider() != "backblaze":
        return False

    from app.services import backblaze_blob_service

    if not backblaze_blob_service.is_backblaze_configured():
        return False

    blob_name = _notice_blob_name(file_path)
    if not blob_name:
        return False
    return backblaze_blob_service.blob_exists(blob_name)


def is_stored_attachment_path(file_path: str) -> bool:
    trimmed = file_path.strip()
    storage = get_storage_service()
    blob_name = storage.extract_blob_name(trimmed)
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

    storage = get_storage_service()
    blob_name = storage.extract_blob_name(trimmed)
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
    """
    Return a frontend-usable download URL.

    STORAGE_PROVIDER controls new uploads, not historical reads:
    - Explicit Azure blob URLs always resolve via Azure SAS.
    - When active provider is backblaze, prefer B2 only if the object exists there;
      otherwise fall back to Azure SAS for pre-migration notice attachments.
    """
    trimmed = (file_path or "").strip()
    if not trimmed:
        return trimmed

    from app.services import azure_blob_service

    if _looks_like_azure_blob_url(trimmed):
        return azure_blob_service.resolve_download_url(trimmed)

    if _active_provider() == "backblaze":
        from app.services import backblaze_blob_service

        blob_name = _notice_blob_name(trimmed)
        if (
            blob_name
            and backblaze_blob_service.is_backblaze_configured()
            and backblaze_blob_service.blob_exists(blob_name)
        ):
            return backblaze_blob_service.resolve_download_url(trimmed)

        if azure_blob_service.is_azure_storage_configured():
            return azure_blob_service.resolve_download_url(trimmed)

    return get_storage_service().resolve_download_url(trimmed)


def download_notice_attachment_bytes(file_path: str) -> bytes:
    """
    Download notice attachment bytes.

    Uses the active storage provider first. When STORAGE_PROVIDER=backblaze,
    falls back to Azure for legacy blobs that were never migrated. Also falls
    back to legacy on-disk files when the path is not a cloud blob.
    """
    trimmed = (file_path or "").strip()
    if not trimmed:
        raise ValidationException("Invalid attachment path")

    from app.services import azure_blob_service

    blob_name = _notice_blob_name(trimmed)
    if blob_name:
        if _looks_like_azure_blob_url(trimmed):
            return azure_blob_service.download_bytes(blob_name)

        storage = get_storage_service()
        try:
            return storage.download_bytes(blob_name)
        except ValidationException as exc:
            message = str(exc).lower()
            if (
                "not found" in message
                and _active_provider() == "backblaze"
                and azure_blob_service.is_azure_storage_configured()
            ):
                return azure_blob_service.download_bytes(blob_name)
            raise

    disk_path = disk_path_for_attachment(trimmed)
    if os.path.isfile(disk_path):
        with open(disk_path, "rb") as handle:
            return handle.read()

    raise ValidationException("File not found")


def delete_notice_attachment_file(file_path: str) -> None:
    """Delete attachment from storage (and best-effort legacy local disk)."""
    trimmed = (file_path or "").strip()
    blob_name = _notice_blob_name(trimmed) or get_storage_service().extract_blob_name(trimmed)

    if blob_name:
        if _looks_like_azure_blob_url(trimmed):
            from app.services import azure_blob_service

            azure_blob_service.delete_blob(blob_name)
        else:
            get_storage_service().delete_blob(blob_name)
            # Legacy Azure rows share the same blob-name shape; clean up there too
            # when the active provider is backblaze (missing blobs are ignored).
            if _active_provider() == "backblaze":
                from app.services import azure_blob_service

                if azure_blob_service.is_azure_storage_configured():
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
