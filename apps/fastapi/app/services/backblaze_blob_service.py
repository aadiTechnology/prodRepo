from __future__ import annotations

import logging
from functools import lru_cache
from io import BytesIO
from types import ModuleType
from urllib.parse import unquote, urlparse

from app.core.config import settings
from app.core.exceptions import ValidationException

logger = logging.getLogger(__name__)

_ATTACHMENT_PREFIXES = (
    "notice-attachments/",
    "homework-attachments/",
    "activity-gallery-media/",
    "syllabus-attachments/",
    "support-query-attachments/",
    "support-release-notes/",
    "sidebar-icons/",
)

_b2_module: ModuleType | None = None


def _b2() -> ModuleType:
    """Lazy-import b2sdk so Azure-only reads do not crash when the package is missing."""
    global _b2_module
    if _b2_module is not None:
        return _b2_module
    try:
        import b2sdk.v2 as b2_mod
    except ImportError as exc:
        raise ValidationException(
            "Backblaze SDK (b2sdk) is not installed. "
            "Run: pip install 'b2sdk>=2.0.0' and restart the API."
        ) from exc
    _b2_module = b2_mod
    return b2_mod


def _auth_config_error(exc: Exception) -> ValidationException:
    """Map B2 auth failures to a clear, non-500 API error."""
    logger.error(
        "Backblaze authorization failed (%s). "
        "STORAGE_PROVIDER=%s bucket_configured=%s key_id_present=%s app_key_present=%s",
        type(exc).__name__,
        settings.STORAGE_PROVIDER,
        bool((settings.BACKBLAZE_BUCKET_NAME or "").strip()),
        bool((settings.BACKBLAZE_KEY_ID or "").strip()),
        bool((settings.BACKBLAZE_APP_KEY or "").strip()),
    )
    return ValidationException(
        "Backblaze B2 rejected BACKBLAZE_KEY_ID/BACKBLAZE_APP_KEY "
        "(invalid or revoked application key). Create a new Application Key "
        "for bucket aaditech-erp-test-v2, update the env file, and restart the API."
    )


@lru_cache(maxsize=1)
def _b2_api():
    """Initialize B2 API client with credentials from config."""
    b2 = _b2()
    key_id = (settings.BACKBLAZE_KEY_ID or "").strip()
    app_key = (settings.BACKBLAZE_APP_KEY or "").strip()

    if not key_id or not app_key:
        raise ValidationException("Backblaze B2 credentials not configured")

    info = b2.InMemoryAccountInfo()
    api = b2.B2Api(info)
    try:
        api.authorize_account("production", key_id, app_key)
    except (
        b2.exception.InvalidAuthToken,
        b2.exception.Unauthorized,
        b2.exception.B2Error,
    ) as exc:
        # Do not cache failed auth attempts via a raised exception path.
        _b2_api.cache_clear()
        raise _auth_config_error(exc) from exc
    return api


def _bucket_name() -> str:
    bucket = (settings.BACKBLAZE_BUCKET_NAME or "").strip()
    if not bucket:
        raise ValidationException("Backblaze bucket name not configured")
    return bucket


def is_backblaze_configured() -> bool:
    try:
        _b2()
    except ValidationException:
        return False
    return bool(
        (settings.BACKBLAZE_KEY_ID or "").strip()
        and (settings.BACKBLAZE_APP_KEY or "").strip()
        and (settings.BACKBLAZE_BUCKET_NAME or "").strip()
    )


def is_storage_configured() -> bool:
    return is_backblaze_configured()


def ensure_bucket_exists() -> None:
    """Verify bucket exists. B2 doesn't auto-create; bucket must pre-exist."""
    if not is_backblaze_configured():
        return

    b2 = _b2()
    try:
        api = _b2_api()
        api.get_bucket_by_name(_bucket_name())
        logger.info("Bucket %s verified", _bucket_name())
    except ValidationException:
        raise
    except b2.exception.NonExistentBucket:
        raise ValidationException(
            f"Backblaze bucket '{_bucket_name()}' does not exist. "
            "Create it in Backblaze B2 console first."
        )
    except (
        b2.exception.InvalidAuthToken,
        b2.exception.Unauthorized,
        b2.exception.B2Error,
    ) as exc:
        raise _auth_config_error(exc) from exc


def upload_bytes(
    *,
    blob_name: str,
    content: bytes,
    content_type: str | None = None,
) -> str:
    """Upload bytes to Backblaze B2 with same naming as Azure."""
    if not blob_name or not blob_name.strip():
        raise ValidationException("Invalid blob name")

    ensure_bucket_exists()

    try:
        api = _b2_api()
        bucket = api.get_bucket_by_name(_bucket_name())

        bucket.upload_bytes(
            data_bytes=content,
            file_name=blob_name.strip(),
            content_type=content_type or "application/octet-stream",
        )

        logger.info("Uploaded to B2: %s", blob_name)
        return blob_name.strip()

    except ValidationException:
        raise
    except Exception as exc:
        logger.exception("Backblaze upload failed for %s", blob_name)
        raise ValidationException("File upload failed") from exc


def _get_file_version(blob_name: str):
    """Return the latest file version info for a B2 object name, or None."""
    trimmed = (blob_name or "").strip()
    if not trimmed or not is_backblaze_configured():
        return None

    b2 = _b2()
    api = _b2_api()
    bucket = api.get_bucket_by_name(_bucket_name())
    try:
        return bucket.get_file_info_by_name(trimmed)
    except b2.exception.FileNotPresent:
        return None


def blob_exists(blob_name: str) -> bool:
    """Check if blob exists in B2."""
    try:
        return _get_file_version(blob_name) is not None
    except Exception:
        logger.exception("B2 exists check failed for %s", blob_name)
        return False


def delete_blob(blob_name: str) -> None:
    """Delete blob from B2. Missing files are ignored."""
    trimmed = (blob_name or "").strip()
    if not trimmed or not is_backblaze_configured():
        return

    try:
        file_version = _get_file_version(trimmed)
        if not file_version:
            return
        api = _b2_api()
        api.delete_file_version(file_version.id_, file_version.file_name)
        logger.info("Deleted from B2: %s", trimmed)
    except Exception:
        logger.exception("B2 delete failed for %s", trimmed)


def download_bytes(blob_name: str) -> bytes:
    """Download bytes from B2."""
    trimmed = (blob_name or "").strip()
    if not trimmed:
        raise ValidationException("Invalid blob name")

    b2 = _b2()
    try:
        api = _b2_api()
        bucket = api.get_bucket_by_name(_bucket_name())
        downloaded = bucket.download_file_by_name(trimmed)
        buffer = BytesIO()
        downloaded.save(buffer)
        return buffer.getvalue()
    except b2.exception.FileNotPresent as exc:
        raise ValidationException("File not found") from exc
    except Exception as exc:
        logger.exception("B2 download failed for %s", trimmed)
        raise ValidationException("File download failed") from exc


def get_blob_url(blob_name: str) -> str:
    """Generate the permanent (unauthorized) B2 download URL for a file name."""
    trimmed = (blob_name or "").strip()
    if not trimmed:
        raise ValidationException("Invalid blob name")

    try:
        api = _b2_api()
        endpoint = api.account_info.get_download_url()
        return f"{endpoint}/file/{_bucket_name()}/{trimmed}"
    except Exception as exc:
        logger.exception("B2 URL generation failed for %s", trimmed)
        raise ValidationException("URL generation failed") from exc


def generate_authorized_download_url(
    blob_name: str,
    *,
    expiry_seconds: int | None = None,
) -> str:
    """
    Generate a time-limited authorized download URL for a private B2 object.

    Equivalent to Azure SAS: no application keys are exposed to the frontend.
    """
    trimmed = (blob_name or "").strip()
    if not trimmed:
        raise ValidationException("Invalid blob name")

    seconds = expiry_seconds
    if seconds is None:
        minutes = getattr(settings, "AZURE_BLOB_SAS_EXPIRY_MINUTES", 60) or 60
        seconds = max(60, int(minutes) * 60)
    if seconds < 60:
        seconds = 60

    try:
        api = _b2_api()
        bucket = api.get_bucket_by_name(_bucket_name())
        auth_token = bucket.get_download_authorization(
            file_name_prefix=trimmed,
            valid_duration_in_seconds=seconds,
        )
        return f"{get_blob_url(trimmed)}?Authorization={auth_token}"
    except ValidationException:
        raise
    except Exception as exc:
        logger.exception("B2 authorized URL generation failed for %s", trimmed)
        raise ValidationException("Unable to generate secure download URL") from exc


def extract_blob_name(file_path: str) -> str | None:
    """
    Normalize a stored path / B2 URL into a bucket-relative blob name.

    Accepts:
    - blob names: notice-attachments/foo.pdf
    - legacy app paths: /notice-attachments/foo.pdf
    - full B2 URLs: https://f003.backblazeb2.com/file/<bucket>/notice-attachments/foo.pdf
    """
    trimmed = (file_path or "").strip()
    if not trimmed or trimmed.startswith("data:"):
        return None

    if trimmed.startswith("http://") or trimmed.startswith("https://"):
        parsed = urlparse(trimmed)
        path = unquote(parsed.path or "").lstrip("/")
        parts = [p for p in path.split("/") if p]
        bucket = _bucket_name() if is_backblaze_configured() else ""

        # Standard B2 download path: file/<bucket>/<blob...>
        if len(parts) >= 3 and parts[0] == "file" and (not bucket or parts[1] == bucket):
            return "/".join(parts[2:])

        if bucket and path.startswith(f"{bucket}/"):
            return path[len(bucket) + 1 :]

        if len(parts) >= 2:
            return "/".join(parts[-2:])
        return parts[-1] if parts else None

    normalized = trimmed.lstrip("/")
    if normalized.startswith("attachments/"):
        normalized = normalized[len("attachments/") :]
    return normalized or None


def resolve_download_url(file_path: str) -> str:
    """
    Resolve a stored file_path to a frontend-usable download URL.

    Private buckets receive a time-limited authorized download URL (not a
    public/anonymous URL). Falls back to the original path for legacy local files.
    """
    trimmed = (file_path or "").strip()
    if not trimmed:
        return trimmed

    if not is_backblaze_configured():
        return trimmed

    blob_name = extract_blob_name(trimmed)
    if not blob_name:
        return trimmed

    if not blob_name.startswith(_ATTACHMENT_PREFIXES) and not (
        trimmed.startswith("http://") or trimmed.startswith("https://")
    ):
        return trimmed

    try:
        if not blob_exists(blob_name):
            return trimmed
        return generate_authorized_download_url(blob_name)
    except Exception:
        logger.exception("Failed to generate B2 URL for %s", blob_name)
        return trimmed
