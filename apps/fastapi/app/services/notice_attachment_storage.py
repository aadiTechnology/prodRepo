from __future__ import annotations

import base64
import os
import re
from datetime import datetime
from uuid import uuid4

from app.core.exceptions import ValidationException

UPLOAD_DIR = os.path.join("static", "notice-attachments")
os.makedirs(UPLOAD_DIR, exist_ok=True)

DATA_URL_RE = re.compile(r"^data:(?P<mime>[^;]+);base64,(?P<data>.+)$", re.DOTALL)
MAX_FILE_BYTES = 5 * 1024 * 1024

MIME_TO_EXT = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
}


def persist_notice_attachment_path(
    *,
    tenant_id: int,
    notice_id: int,
    file_name: str,
    file_path: str,
    file_type: str,
) -> str:
    """Store attachment on disk when given a data URL; return a short public path for DB."""
    if not file_path:
        raise ValidationException("Invalid file format or size exceeded")

    trimmed = file_path.strip()
    if trimmed.startswith("/notice-attachments/") or trimmed.startswith("/homework-attachments/"):
        return trimmed[:500]

    if trimmed.startswith("http://") or trimmed.startswith("https://"):
        if len(trimmed) <= 500:
            return trimmed
        raise ValidationException("Invalid file format or size exceeded")

    match = DATA_URL_RE.match(trimmed)
    if not match:
        if len(trimmed) <= 500:
            return trimmed
        raise ValidationException("Invalid file format or size exceeded")

    mime = (match.group("mime") or file_type or "").lower()
    raw = match.group("data") or ""
    try:
        content = base64.b64decode(raw, validate=True)
    except Exception as exc:
        raise ValidationException("Invalid file format or size exceeded") from exc

    if len(content) > MAX_FILE_BYTES:
        raise ValidationException("Invalid file format or size exceeded")

    ext = MIME_TO_EXT.get(mime) or os.path.splitext(file_name or "")[1].lower() or ".bin"
    unique_suffix = datetime.utcnow().strftime("%Y%m%d%H%M%S") + "_" + uuid4().hex[:8]
    safe_name = f"{tenant_id}_{notice_id}_{unique_suffix}{ext}"
    disk_path = os.path.join(UPLOAD_DIR, safe_name)

    try:
        with open(disk_path, "wb") as buf:
            buf.write(content)
    except OSError as exc:
        raise ValidationException("File upload failed") from exc

    return f"/notice-attachments/{safe_name}"
