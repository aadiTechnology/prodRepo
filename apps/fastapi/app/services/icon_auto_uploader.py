"""
Auto-upload sidebar icons to storage provider on startup.
Runs once per app initialization - no manual upload needed.
"""

import os
import logging
from pathlib import Path
from functools import lru_cache

from app.core.config import settings

logger = logging.getLogger(__name__)

SIDEBAR_ICONS_PREFIX = "sidebar-icons"

ICON_FILES = {
    "academics.png": "academics",
    "attendance.png": "attendance",
    "communication.png": "communication",
    "dashboard.png": "dashboard",
    "settings.png": "settings",
}


def _get_icon_dir() -> Path:
    """Get icon directory path."""
    return Path(__file__).parent.parent.parent.parent / "web" / "public" / "assets" / "icons"


def get_local_icons() -> dict[str, bytes]:
    """Load local icon files into memory."""
    icons = {}
    icon_dir = _get_icon_dir()

    if not icon_dir.exists():
        logger.warning(f"Icon directory not found: {icon_dir}")
        return icons

    for filename, icon_name in ICON_FILES.items():
        icon_path = icon_dir / filename
        if icon_path.exists():
            with open(icon_path, "rb") as f:
                icons[icon_name] = f.read()
                logger.debug(f"Loaded icon: {icon_name}")

    return icons


def auto_upload_icons_to_storage() -> dict[str, str]:
    """
    Auto-upload icons to configured storage provider on app startup.
    Runs once - subsequent calls are no-ops.

    Returns:
        dict mapping icon names to blob paths in storage
    """
    from app.services.blob_storage_factory import get_storage_service

    provider = (settings.STORAGE_PROVIDER or "azure").lower()
    logger.info(f"Auto-uploading sidebar icons to {provider.upper()}")

    try:
        storage = get_storage_service()
    except Exception as e:
        logger.error(f"Storage not configured: {e}")
        return {}

    icons = get_local_icons()
    if not icons:
        logger.warning("No local icons found - skipping upload")
        return {}

    uploaded = {}
    for icon_name, content in icons.items():
        blob_name = f"{SIDEBAR_ICONS_PREFIX}/{icon_name}.png"

        # Check if already exists (skip re-upload)
        if storage.blob_exists(blob_name):
            logger.debug(f"Icon already in storage: {blob_name}")
            uploaded[icon_name] = blob_name
            continue

        try:
            result = storage.upload_bytes(
                blob_name=blob_name,
                content=content,
                content_type="image/png",
            )
            uploaded[icon_name] = result
            logger.info(f"Uploaded icon: {icon_name} → {blob_name}")
        except Exception as e:
            logger.error(f"Failed to upload {icon_name}: {e}")

    return uploaded


@lru_cache(maxsize=1)
def get_icon_urls() -> dict[str, str]:
    """
    Get download URLs for all sidebar icons.
    Automatically uploaded on first call.
    """
    from app.services.blob_storage_factory import get_storage_service

    # Auto-upload if needed
    auto_upload_icons_to_storage()

    storage = get_storage_service()
    urls = {}

    for icon_name in ICON_FILES.values():
        blob_name = f"{SIDEBAR_ICONS_PREFIX}/{icon_name}.png"
        try:
            url = storage.get_blob_url(blob_name)
            urls[icon_name] = url
        except Exception as e:
            logger.error(f"Failed to get URL for {icon_name}: {e}")
            # Fallback to local if storage fails
            urls[icon_name] = f"/assets/icons/{icon_name}.png"

    return urls
