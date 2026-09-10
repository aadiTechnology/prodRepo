from __future__ import annotations

import logging
from functools import lru_cache

import b2sdk.v2 as b2

from app.core.config import settings
from app.core.exceptions import ValidationException

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _b2_api() -> b2.B2Api:
    """Initialize B2 API client with credentials from config."""
    key_id = (settings.BACKBLAZE_KEY_ID or "").strip()
    app_key = (settings.BACKBLAZE_APP_KEY or "").strip()

    if not key_id or not app_key:
        raise ValidationException("Backblaze B2 credentials not configured")

    info = b2.InMemoryAccountInfo()
    api = b2.B2Api(info)
    api.authorize_account("production", key_id, app_key)
    return api


def _bucket_name() -> str:
    bucket = (settings.BACKBLAZE_BUCKET_NAME or "").strip()
    if not bucket:
        raise ValidationException("Backblaze bucket name not configured")
    return bucket


def is_backblaze_configured() -> bool:
    return bool(
        (settings.BACKBLAZE_KEY_ID or "").strip()
        and (settings.BACKBLAZE_APP_KEY or "").strip()
        and (settings.BACKBLAZE_BUCKET_NAME or "").strip()
    )


def ensure_bucket_exists() -> None:
    """Verify bucket exists. B2 doesn't auto-create; bucket must pre-exist."""
    if not is_backblaze_configured():
        return

    try:
        api = _b2_api()
        bucket = api.get_bucket_by_name(_bucket_name())
        logger.info(f"Bucket {_bucket_name()} verified")
    except b2.exception.NonExistentBucket:
        raise ValidationException(
            f"Backblaze bucket '{_bucket_name()}' does not exist. "
            "Create it in Backblaze B2 console first."
        )


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

        logger.info(f"Uploaded to B2: {blob_name}")
        return blob_name.strip()

    except Exception as exc:
        logger.exception("Backblaze upload failed for %s", blob_name)
        raise ValidationException("File upload failed") from exc


def blob_exists(blob_name: str) -> bool:
    """Check if blob exists in B2."""
    trimmed = (blob_name or "").strip()
    if not trimmed or not is_backblaze_configured():
        return False

    try:
        api = _b2_api()
        bucket = api.get_bucket_by_name(_bucket_name())

        for file_version, _ in bucket.ls(recursive=False, fetch_count=1):
            if file_version.file_name == trimmed:
                return True
        return False

    except Exception:
        logger.exception("B2 exists check failed for %s", trimmed)
        return False


def delete_blob(blob_name: str) -> None:
    """Delete blob from B2. Missing files are ignored."""
    trimmed = (blob_name or "").strip()
    if not trimmed or not is_backblaze_configured():
        return

    try:
        api = _b2_api()
        bucket = api.get_bucket_by_name(_bucket_name())

        for file_version, _ in bucket.ls(recursive=False, fetch_count=1):
            if file_version.file_name == trimmed:
                api.delete_file_version(file_version.id_, trimmed)
                logger.info(f"Deleted from B2: {trimmed}")
                return
    except Exception:
        logger.exception("B2 delete failed for %s", trimmed)


def download_bytes(blob_name: str) -> bytes:
    """Download bytes from B2."""
    trimmed = (blob_name or "").strip()
    if not trimmed:
        raise ValidationException("Invalid blob name")

    try:
        api = _b2_api()
        bucket = api.get_bucket_by_name(_bucket_name())

        downloaded = bucket.download_file_by_id(blob_name=trimmed)
        return downloaded.read()

    except Exception as exc:
        logger.exception("B2 download failed for %s", trimmed)
        raise ValidationException("File download failed") from exc


def get_blob_url(blob_name: str) -> str:
    """Generate a download URL for B2 file."""
    trimmed = (blob_name or "").strip()
    if not trimmed:
        raise ValidationException("Invalid blob name")

    try:
        api = _b2_api()
        endpoint = api.account_info.get_download_url()
        url = f"{endpoint}/file/{_bucket_name()}/{trimmed}"
        return url

    except Exception as exc:
        logger.exception("B2 URL generation failed for %s", trimmed)
        raise ValidationException("URL generation failed") from exc
