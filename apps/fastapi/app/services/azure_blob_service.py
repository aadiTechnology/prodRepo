from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from urllib.parse import unquote, urlparse

from azure.core.exceptions import ResourceExistsError, ResourceNotFoundError
from azure.storage.blob import (
    BlobSasPermissions,
    BlobServiceClient,
    ContentSettings,
    generate_blob_sas,
)

from app.core.config import settings
from app.core.exceptions import ValidationException

logger = logging.getLogger(__name__)


def is_azure_storage_configured() -> bool:
    return bool(
        (settings.AZURE_STORAGE_CONNECTION_STRING or "").strip()
        and (settings.AZURE_CONTAINER_NAME or "").strip()
    )


@lru_cache(maxsize=1)
def _blob_service_client() -> BlobServiceClient:
    connection_string = (settings.AZURE_STORAGE_CONNECTION_STRING or "").strip()
    if not connection_string:
        raise ValidationException("Azure Blob Storage is not configured")
    return BlobServiceClient.from_connection_string(connection_string)


def _container_name() -> str:
    container = (settings.AZURE_CONTAINER_NAME or "").strip()
    if not container:
        raise ValidationException("Azure Blob Storage container is not configured")
    return container


def ensure_container_exists() -> None:
    """Create the configured container if it does not already exist."""
    if not is_azure_storage_configured():
        return
    client = _blob_service_client().get_container_client(_container_name())
    try:
        client.create_container()
    except ResourceExistsError:
        pass


def upload_bytes(
    *,
    blob_name: str,
    content: bytes,
    content_type: str | None = None,
) -> str:
    """Upload bytes to Azure Blob Storage and return the blob name."""
    if not blob_name or not blob_name.strip():
        raise ValidationException("Invalid blob name")

    ensure_container_exists()
    blob_client = _blob_service_client().get_blob_client(
        container=_container_name(),
        blob=blob_name.strip(),
    )
    try:
        blob_client.upload_blob(
            content,
            overwrite=True,
            content_settings=ContentSettings(
                content_type=content_type or "application/octet-stream"
            ),
        )
    except Exception as exc:
        logger.exception("Azure blob upload failed for %s", blob_name)
        raise ValidationException("File upload failed") from exc

    return blob_name.strip()


def blob_exists(blob_name: str) -> bool:
    trimmed = (blob_name or "").strip()
    if not trimmed or not is_azure_storage_configured():
        return False
    blob_client = _blob_service_client().get_blob_client(
        container=_container_name(),
        blob=trimmed,
    )
    try:
        return bool(blob_client.exists())
    except Exception:
        logger.exception("Azure blob exists check failed for %s", trimmed)
        return False


def delete_blob(blob_name: str) -> None:
    """Delete a blob if it exists. Missing blobs are ignored."""
    trimmed = (blob_name or "").strip()
    if not trimmed or not is_azure_storage_configured():
        return

    blob_client = _blob_service_client().get_blob_client(
        container=_container_name(),
        blob=trimmed,
    )
    try:
        blob_client.delete_blob()
    except ResourceNotFoundError:
        return
    except Exception:
        logger.exception("Azure blob delete failed for %s", trimmed)


def download_bytes(blob_name: str) -> bytes:
    trimmed = (blob_name or "").strip()
    if not trimmed:
        raise ValidationException("Invalid blob name")

    blob_client = _blob_service_client().get_blob_client(
        container=_container_name(),
        blob=trimmed,
    )
    try:
        return blob_client.download_blob().readall()
    except ResourceNotFoundError as exc:
        raise ValidationException("File not found") from exc
    except Exception as exc:
        logger.exception("Azure blob download failed for %s", trimmed)
        raise ValidationException("File download failed") from exc


def generate_sas_url(
    blob_name: str,
    *,
    expiry_minutes: int | None = None,
) -> str:
    """Generate a time-limited read-only SAS URL for the given blob."""
    trimmed = (blob_name or "").strip()
    if not trimmed:
        raise ValidationException("Invalid blob name")

    minutes = expiry_minutes or settings.AZURE_BLOB_SAS_EXPIRY_MINUTES
    if minutes < 1:
        minutes = 60

    service = _blob_service_client()
    account_name = service.account_name
    credential = service.credential
    account_key = getattr(credential, "account_key", None)
    if not account_name or not account_key:
        raise ValidationException("Unable to generate secure download URL")

    sas_token = generate_blob_sas(
        account_name=account_name,
        container_name=_container_name(),
        blob_name=trimmed,
        account_key=account_key,
        permission=BlobSasPermissions(read=True),
        expiry=datetime.now(timezone.utc) + timedelta(minutes=minutes),
    )
    blob_client = service.get_blob_client(container=_container_name(), blob=trimmed)
    return f"{blob_client.url}?{sas_token}"


def get_blob_url(blob_name: str) -> str:
    """Return the permanent (non-SAS) blob URL."""
    trimmed = (blob_name or "").strip()
    blob_client = _blob_service_client().get_blob_client(
        container=_container_name(),
        blob=trimmed,
    )
    return blob_client.url


def extract_blob_name(file_path: str) -> str | None:
    """
    Normalize a stored path / Azure URL into a container-relative blob name.

    Accepts:
    - blob names: notice-attachments/foo.pdf
    - legacy app paths: /notice-attachments/foo.pdf, attachments/homework-attachments/foo.pdf
    - full Azure blob URLs (with or without SAS query)
    """
    trimmed = (file_path or "").strip()
    if not trimmed:
        return None

    if trimmed.startswith("data:"):
        return None

    if trimmed.startswith("http://") or trimmed.startswith("https://"):
        parsed = urlparse(trimmed)
        path = unquote(parsed.path or "").lstrip("/")
        container = _container_name() if is_azure_storage_configured() else ""
        if container and path.startswith(f"{container}/"):
            return path[len(container) + 1 :]
        # Fallback: last two segments often encode folder/file
        parts = [p for p in path.split("/") if p]
        if len(parts) >= 2:
            return "/".join(parts[-2:])
        return parts[-1] if parts else None

    # Strip leading slash and optional "attachments/" prefix used by older homework rows.
    normalized = trimmed.lstrip("/")
    if normalized.startswith("attachments/"):
        normalized = normalized[len("attachments/") :]
    return normalized or None


def resolve_download_url(file_path: str) -> str:
    """
    Resolve a stored file_path to a frontend-usable download URL.

    Prefers a SAS URL when Azure is configured and the path maps to a blob.
    Falls back to the original relative path for legacy local files.
    """
    trimmed = (file_path or "").strip()
    if not trimmed:
        return trimmed

    if not is_azure_storage_configured():
        return trimmed

    blob_name = extract_blob_name(trimmed)
    if not blob_name:
        return trimmed

    azure_prefixes = ("notice-attachments/", "homework-attachments/")
    if not blob_name.startswith(azure_prefixes) and not (
        trimmed.startswith("http://") or trimmed.startswith("https://")
    ):
        return trimmed

    try:
        # Legacy rows can still point to files that were never uploaded to Azure.
        # In that case, keep the original path so existing StaticFiles mounts can serve them.
        if not blob_exists(blob_name):
            return trimmed
        return generate_sas_url(blob_name)
    except Exception:
        logger.exception("Failed to generate SAS URL for %s", blob_name)
        return trimmed
