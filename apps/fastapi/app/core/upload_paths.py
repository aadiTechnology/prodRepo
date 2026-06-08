"""Central paths for uploaded attachment files on disk and their public URL prefixes."""

from __future__ import annotations

import os

from app.core.config import settings

NOTICE_ATTACHMENTS_SUBDIR = "notice-attachments"

# Public URL prefix stored in DB and used by the frontend (unchanged for compatibility).
NOTICE_ATTACHMENTS_URL_PREFIX = f"/{NOTICE_ATTACHMENTS_SUBDIR}"


DEFAULT_UPLOADS_ROOT = "static/uploads"


def uploads_root() -> str:
    # Fallback keeps the API bootable if an older config.py is deployed without UPLOADS_ROOT.
    return getattr(settings, "UPLOADS_ROOT", None) or DEFAULT_UPLOADS_ROOT


def notice_attachments_dir() -> str:
    """Absolute path on disk: static/uploads/notice-attachments"""
    path = os.path.join(uploads_root(), NOTICE_ATTACHMENTS_SUBDIR)
    os.makedirs(path, exist_ok=True)
    return path


def ensure_upload_directories() -> None:
    """Create all upload subdirectories at application startup."""
    os.makedirs(uploads_root(), exist_ok=True)
    notice_attachments_dir()


def notice_attachment_public_path(filename: str) -> str:
    return f"{NOTICE_ATTACHMENTS_URL_PREFIX}/{filename}"


def disk_path_for_public_attachment_path(file_path: str) -> str:
    """Resolve a stored public path to the file on disk."""
    trimmed = file_path.strip().lstrip("/")
    filename = os.path.basename(trimmed)

    new_path = os.path.join(notice_attachments_dir(), filename)
    if os.path.exists(new_path):
        return new_path

    # Legacy location before uploads/ consolidation.
    legacy_path = os.path.join("static", trimmed)
    return legacy_path
