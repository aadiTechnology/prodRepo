"""HTTPS integration URL helpers — aligned with marketingHub.utils.ts on the web app."""

from __future__ import annotations

from urllib.parse import urlparse


def normalize_integration_url(raw: str) -> str:
    """Normalize user input to an HTTPS URL (http:// is upgraded)."""
    trimmed = raw.strip()
    if not trimmed:
        return ""

    if trimmed.lower().startswith("https://"):
        return trimmed

    if trimmed.lower().startswith("http://"):
        return f"https://{trimmed[7:]}"

    return f"https://{trimmed.lstrip('/')}"


def validate_integration_url(raw: str) -> str | None:
    """Return an error message when the value is not a valid HTTPS URL."""
    trimmed = raw.strip()
    if not trimmed:
        return None

    normalized = normalize_integration_url(trimmed)

    try:
        parsed = urlparse(normalized)
    except ValueError:
        return "Enter a valid HTTPS URL (e.g. https://example.com)."

    if parsed.scheme != "https":
        return "URL must use HTTPS."
    if not parsed.hostname:
        return "Enter a valid HTTPS URL."
    return None


def require_https_integration_url(raw: str) -> str:
    """Normalize and validate; raises ValueError when invalid."""
    error = validate_integration_url(raw)
    if error:
        raise ValueError(error)
    return normalize_integration_url(raw)
