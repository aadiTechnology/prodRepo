"""Shared date validation helpers."""

from datetime import date


def validate_not_future_date(value: date | None, field_label: str = "Date of birth") -> date | None:
    if value is None:
        return None
    if value > date.today():
        raise ValueError(f"{field_label} cannot be in the future")
    return value
