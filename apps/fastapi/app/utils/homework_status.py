"""Homework lifecycle status helpers."""

from __future__ import annotations

HOMEWORK_STATUS_DRAFT = "Draft"
HOMEWORK_STATUS_ACTIVE = "Active"
LEGACY_PUBLISHED_STATUS = "Published"

LIVE_HOMEWORK_STATUSES = frozenset({HOMEWORK_STATUS_ACTIVE, LEGACY_PUBLISHED_STATUS})


def normalize_homework_status(status: str | None) -> str:
    value = (status or "").strip()
    if value == LEGACY_PUBLISHED_STATUS:
        return HOMEWORK_STATUS_ACTIVE
    return value


def is_live_homework_status(status: str | None) -> bool:
    return normalize_homework_status(status) in {HOMEWORK_STATUS_ACTIVE}
