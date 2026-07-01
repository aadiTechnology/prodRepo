"""Shared contact-number validation helpers."""

import re

CONTACT_NUMBER_PATTERN = re.compile(r"^\d{10,15}$")


def validate_contact_number(
    value: str | None,
    *,
    required: bool = True,
    field_label: str = "Contact number",
) -> str | None:
    if value is None or not str(value).strip():
        if required:
            raise ValueError(f"{field_label} is required")
        return None

    normalized = str(value).strip()
    if not CONTACT_NUMBER_PATTERN.fullmatch(normalized):
        raise ValueError(f"{field_label} must contain digits only (10-15 digits)")
    return normalized
