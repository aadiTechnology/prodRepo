from __future__ import annotations

from typing import Literal

from app.core.config import settings
from app.core.exceptions import ValidationException

StorageProviderName = Literal["azure", "backblaze"]


def get_active_provider_name() -> StorageProviderName:
    provider = (settings.STORAGE_PROVIDER or "azure").lower()
    if provider in ("azure", "backblaze"):
        return provider  # type: ignore[return-value]
    raise ValidationException(f"Unknown storage provider: {provider}")


def get_storage_service():
    """Return active storage service based on STORAGE_PROVIDER setting (uploads)."""
    provider = get_active_provider_name()
    if provider == "azure":
        from app.services import azure_blob_service

        return azure_blob_service
    from app.services import backblaze_blob_service

    return backblaze_blob_service


def looks_like_azure_blob_url(file_path: str) -> bool:
    return "blob.core.windows.net" in (file_path or "").lower()


def extract_object_name(file_path: str) -> str | None:
    """
    Normalize a stored DB path / URL into a provider-relative object name.

    Azure blob URLs are parsed with the Azure extractor even when the active
    upload provider is Backblaze.
    """
    trimmed = (file_path or "").strip()
    if not trimmed or trimmed.startswith("data:"):
        return None

    if looks_like_azure_blob_url(trimmed):
        from app.services import azure_blob_service

        return azure_blob_service.extract_blob_name(trimmed)

    return get_storage_service().extract_blob_name(trimmed)


def locate_object_provider(file_path: str) -> StorageProviderName | None:
    """
    Decide which provider hosts a stored object without trusting STORAGE_PROVIDER.

    Rules:
    - Explicit Azure blob URL → azure
    - Object exists on Backblaze → backblaze
    - Object exists on Azure → azure
    - If present on both, prefer the active upload provider
    """
    trimmed = (file_path or "").strip()
    if not trimmed:
        return None

    if looks_like_azure_blob_url(trimmed):
        return "azure"

    blob_name = extract_object_name(trimmed)
    if not blob_name:
        return None

    from app.services import azure_blob_service

    on_b2 = False
    try:
        from app.services import backblaze_blob_service

        on_b2 = (
            backblaze_blob_service.is_backblaze_configured()
            and backblaze_blob_service.blob_exists(blob_name)
        )
    except Exception:
        on_b2 = False

    on_azure = (
        azure_blob_service.is_azure_storage_configured()
        and azure_blob_service.blob_exists(blob_name)
    )

    if on_b2 and on_azure:
        return get_active_provider_name()
    if on_b2:
        return "backblaze"
    if on_azure:
        return "azure"
    return None


def resolve_mixed_download_url(file_path: str) -> str:
    """
    Resolve a stored file_path to a secure frontend-usable URL.

    Backblaze → time-limited authorized download URL (private bucket).
    Azure → SAS URL.
    Unknown / missing → original path (legacy static mounts).
    """
    trimmed = (file_path or "").strip()
    if not trimmed:
        return trimmed

    from app.services import azure_blob_service

    provider = locate_object_provider(trimmed)
    if provider == "backblaze":
        from app.services import backblaze_blob_service

        return backblaze_blob_service.resolve_download_url(trimmed)
    if provider == "azure":
        return azure_blob_service.resolve_download_url(trimmed)

    # Ambiguous legacy path: prefer Azure SAS when configured, else active provider.
    if azure_blob_service.is_azure_storage_configured():
        resolved = azure_blob_service.resolve_download_url(trimmed)
        if resolved != trimmed:
            return resolved
    try:
        return get_storage_service().resolve_download_url(trimmed)
    except Exception:
        return trimmed


def download_mixed_bytes(file_path: str) -> bytes:
    """Download object bytes from the provider that hosts the file."""
    trimmed = (file_path or "").strip()
    if not trimmed:
        raise ValidationException("Invalid attachment path")

    from app.services import azure_blob_service

    blob_name = extract_object_name(trimmed)
    if not blob_name:
        raise ValidationException("File not found")

    provider = locate_object_provider(trimmed)
    if provider == "backblaze":
        from app.services import backblaze_blob_service

        return backblaze_blob_service.download_bytes(blob_name)
    if provider == "azure":
        return azure_blob_service.download_bytes(blob_name)

    # Fallbacks when existence checks fail (transient) but the object may still exist.
    active = get_active_provider_name()
    try:
        return get_storage_service().download_bytes(blob_name)
    except ValidationException as exc:
        if "not found" not in str(exc).lower():
            raise
        if (
            active == "backblaze"
            and azure_blob_service.is_azure_storage_configured()
        ):
            return azure_blob_service.download_bytes(blob_name)
        raise


def delete_mixed_blob(file_path: str) -> None:
    """
    Delete an object only from the provider where it actually exists.

    Never deletes an Azure-only legacy object via the Backblaze client (and vice versa).
    """
    trimmed = (file_path or "").strip()
    if not trimmed:
        return

    from app.services import azure_blob_service

    blob_name = extract_object_name(trimmed)
    if not blob_name:
        return

    provider = locate_object_provider(trimmed)
    if provider == "backblaze":
        from app.services import backblaze_blob_service

        backblaze_blob_service.delete_blob(blob_name)
        return
    if provider == "azure":
        azure_blob_service.delete_blob(blob_name)
        return

    # Unknown location: do not guess across providers.
