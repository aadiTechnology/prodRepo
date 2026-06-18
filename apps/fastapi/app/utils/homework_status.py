"""Homework lifecycle status helpers."""

from __future__ import annotations

HOMEWORK_STATUS_DRAFT = "Draft"
HOMEWORK_STATUS_ACTIVE = "Active"
LEGACY_PUBLISHED_STATUS = "Published"

# Values persisted in SQL Server (ck_homework_status allows draft | published).
DB_HOMEWORK_STATUS_DRAFT = "draft"
DB_HOMEWORK_STATUS_PUBLISHED = "published"

LIVE_HOMEWORK_STATUSES = frozenset({HOMEWORK_STATUS_ACTIVE, LEGACY_PUBLISHED_STATUS})
DB_LIVE_HOMEWORK_STATUSES = frozenset(
    {DB_HOMEWORK_STATUS_PUBLISHED, LEGACY_PUBLISHED_STATUS, HOMEWORK_STATUS_ACTIVE}
)
DB_DRAFT_HOMEWORK_STATUSES = frozenset({DB_HOMEWORK_STATUS_DRAFT, HOMEWORK_STATUS_DRAFT})


def normalize_homework_status(status: str | None) -> str:
    value = (status or "").strip()
    if value.lower() == DB_HOMEWORK_STATUS_PUBLISHED:
        return HOMEWORK_STATUS_ACTIVE
    if value.lower() == DB_HOMEWORK_STATUS_DRAFT:
        return HOMEWORK_STATUS_DRAFT
    if value == LEGACY_PUBLISHED_STATUS:
        return HOMEWORK_STATUS_ACTIVE
    return value


def to_db_homework_status(status: str | None) -> str:
    normalized = normalize_homework_status(status)
    if normalized == HOMEWORK_STATUS_ACTIVE:
        return DB_HOMEWORK_STATUS_PUBLISHED
    if normalized == HOMEWORK_STATUS_DRAFT:
        return DB_HOMEWORK_STATUS_DRAFT
    return (status or DB_HOMEWORK_STATUS_DRAFT).strip().lower()


def from_db_homework_status(status: str | None) -> str:
    return normalize_homework_status(status)


def is_draft_homework_status(status: str | None) -> bool:
    return normalize_homework_status(status) == HOMEWORK_STATUS_DRAFT


def is_live_homework_status(status: str | None) -> bool:
    return normalize_homework_status(status) == HOMEWORK_STATUS_ACTIVE
