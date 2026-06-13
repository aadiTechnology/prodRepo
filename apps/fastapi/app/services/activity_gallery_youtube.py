from __future__ import annotations

import re

from app.core.exceptions import ValidationException

_YOUTUBE_ID_PATTERN = re.compile(
    r"(?:youtube\.com/(?:watch\?(?:.*&)?v=|embed/|shorts/)|youtu\.be/)([\w-]{11})",
    re.IGNORECASE,
)


def extract_youtube_video_id(url: str) -> str | None:
    trimmed = (url or "").strip()
    if not trimmed:
        return None
    match = _YOUTUBE_ID_PATTERN.search(trimmed)
    return match.group(1) if match else None


def normalize_youtube_url(url: str) -> tuple[str, str]:
    video_id = extract_youtube_video_id(url)
    if not video_id:
        raise ValidationException("Please enter a valid YouTube video URL")
    watch_url = f"https://www.youtube.com/watch?v={video_id}"
    return watch_url, video_id
