"""Shared JPEG compression before Azure Blob upload.

Original images may be up to 4 MB. Target stored size is ~400 KB (cap 500 KB).
Exact 10x reduction is not guaranteed. Do not use this for PDF or video.
"""
from __future__ import annotations

import os
from io import BytesIO

from PIL import Image, ImageOps

from app.core.exceptions import ValidationException

MAX_ORIGINAL_IMAGE_BYTES = 4 * 1024 * 1024
TARGET_COMPRESSED_IMAGE_BYTES = 400 * 1024
MAX_STORED_IMAGE_BYTES = 500 * 1024
JPEG_CONTENT_TYPE = "image/jpeg"
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".jfif", ".webp", ".gif"}


def is_compressable_image(file_name: str | None = None, content_type: str | None = None) -> bool:
    mime = (content_type or "").lower().split(";")[0].strip()
    if mime.startswith("image/") and mime not in {"image/svg+xml"}:
        return True
    ext = os.path.splitext(file_name or "")[1].lower()
    return ext in IMAGE_EXTENSIONS


def prepare_file_for_storage(
    *,
    file_name: str,
    content: bytes,
    content_type: str | None,
    max_bytes: int,
) -> tuple[bytes, str | None, str]:
    """Return (bytes, content_type, extension). Images are JPEG-compressed; other types unchanged."""
    ext = os.path.splitext(file_name or "")[1].lower() or ".bin"
    if not is_compressable_image(file_name, content_type):
        if len(content) > max_bytes:
            mb = max(1, max_bytes // (1024 * 1024))
            raise ValidationException(f"File size exceeded. Maximum allowed size is {mb} MB")
        return content, content_type, ext

    image_max = min(max_bytes, MAX_ORIGINAL_IMAGE_BYTES)
    if len(content) > image_max:
        mb = max(1, image_max // (1024 * 1024))
        raise ValidationException(f"Image size must not exceed {mb} MB")
    stored = compress_image_to_jpeg(content)
    return stored, JPEG_CONTENT_TYPE, ".jpg"


def compress_image_to_jpeg(file_bytes: bytes) -> bytes:
    if not file_bytes:
        raise ValidationException("Please upload at least one file")
    if len(file_bytes) > MAX_ORIGINAL_IMAGE_BYTES:
        raise ValidationException("Image size must not exceed 4 MB")

    if len(file_bytes) <= TARGET_COMPRESSED_IMAGE_BYTES:
        try:
            with Image.open(BytesIO(file_bytes)) as probe:
                fmt = (probe.format or "").upper()
        except Exception as exc:
            raise ValidationException("Invalid image file") from exc
        if fmt in {"JPEG", "JPG"}:
            return file_bytes

    try:
        image = Image.open(BytesIO(file_bytes))
        image = ImageOps.exif_transpose(image)
    except Exception as exc:
        raise ValidationException("Invalid image file") from exc

    if image.mode in ("RGBA", "LA", "P"):
        background = Image.new("RGB", image.size, (255, 255, 255))
        converted = image.convert("RGBA") if image.mode != "RGBA" else image
        background.paste(converted, mask=converted.split()[-1])
        image = background
    elif image.mode != "RGB":
        image = image.convert("RGB")

    image.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
    quality = 75
    output = BytesIO()
    while quality >= 30:
        output = BytesIO()
        image.save(output, format="JPEG", quality=quality, optimize=True)
        if output.tell() <= TARGET_COMPRESSED_IMAGE_BYTES:
            output.seek(0)
            return output.getvalue()
        quality -= 5

    image.thumbnail((1200, 1200), Image.Resampling.LANCZOS)
    output = BytesIO()
    image.save(output, format="JPEG", quality=50, optimize=True)
    if output.tell() > MAX_STORED_IMAGE_BYTES:
        image.thumbnail((960, 960), Image.Resampling.LANCZOS)
        output = BytesIO()
        image.save(output, format="JPEG", quality=40, optimize=True)
    output.seek(0)
    return output.getvalue()
