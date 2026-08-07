"""Firebase Cloud Messaging (FCM) delivery service.

Reusable low-level send helper. Notification Service remains the single entry
point for feature workflows; call sites must not send ad-hoc push payloads.
"""

from __future__ import annotations

import json
import threading
from typing import Iterable, List, Optional, Sequence, Tuple

from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)

_init_lock = threading.Lock()
_firebase_ready: Optional[bool] = None


def is_fcm_configured() -> bool:
    return bool(
        (settings.FIREBASE_CREDENTIALS_PATH or "").strip()
        or (settings.FIREBASE_CREDENTIALS_JSON or "").strip()
    )


def _ensure_firebase_app() -> bool:
    """Initialize firebase-admin once. Returns False when unconfigured or init fails."""
    global _firebase_ready
    if _firebase_ready is not None:
        return _firebase_ready

    with _init_lock:
        if _firebase_ready is not None:
            return _firebase_ready

        if not is_fcm_configured():
            logger.info("FCM skipped: Firebase credentials are not configured")
            _firebase_ready = False
            return False

        try:
            import firebase_admin
            from firebase_admin import credentials

            if firebase_admin._apps:
                _firebase_ready = True
                return True

            path = (settings.FIREBASE_CREDENTIALS_PATH or "").strip()
            raw_json = (settings.FIREBASE_CREDENTIALS_JSON or "").strip()
            if path:
                cred = credentials.Certificate(path)
            else:
                cred = credentials.Certificate(json.loads(raw_json))
            firebase_admin.initialize_app(cred)
            _firebase_ready = True
            logger.info("Firebase Admin initialized for FCM")
            return True
        except Exception:
            logger.exception("Firebase Admin initialization failed")
            _firebase_ready = False
            return False


def send_to_tokens(
    *,
    tokens: Sequence[str],
    title: str,
    body: str,
    data: Optional[dict[str, str]] = None,
) -> Tuple[int, int, List[str]]:
    """
    Send a notification to FCM registration tokens.

    Returns (success_count, failure_count, invalid_tokens).
    Never raises on per-token send failure.
    """
    cleaned = [t.strip() for t in tokens if t and str(t).strip()]
    if not cleaned:
        return 0, 0, []

    if not _ensure_firebase_app():
        return 0, len(cleaned), []

    try:
        from firebase_admin import messaging
    except Exception:
        logger.exception("firebase_admin.messaging import failed")
        return 0, len(cleaned), []

    payload_data = {str(k): str(v) for k, v in (data or {}).items()}
    success = 0
    failure = 0
    invalid: List[str] = []

    # Batch in chunks of 500 (FCM multicast limit)
    for chunk in _chunks(cleaned, 500):
        try:
            message = messaging.MulticastMessage(
                tokens=list(chunk),
                notification=messaging.Notification(title=title, body=body),
                data=payload_data or None,
                android=messaging.AndroidConfig(
                    priority="high",
                    notification=messaging.AndroidNotification(
                        title=title,
                        body=body,
                        sound="default",
                    ),
                ),
            )
            response = messaging.send_each_for_multicast(message)
            success += int(response.success_count)
            failure += int(response.failure_count)
            for idx, send_response in enumerate(response.responses):
                if send_response.success:
                    continue
                exc = send_response.exception
                token = chunk[idx]
                code = getattr(exc, "code", None) or ""
                msg = str(exc) if exc else "unknown"
                logger.warning(
                    "FCM send failed token=…%s code=%s error=%s",
                    token[-12:] if len(token) > 12 else token,
                    code,
                    msg,
                )
                if _is_invalid_token_error(exc):
                    invalid.append(token)
        except Exception:
            logger.exception("FCM multicast send failed for %s token(s)", len(chunk))
            failure += len(chunk)

    return success, failure, invalid


def _is_invalid_token_error(exc: object) -> bool:
    if exc is None:
        return False
    code = str(getattr(exc, "code", "") or "").lower()
    text = str(exc).lower()
    markers = (
        "registration-token-not-registered",
        "invalid-registration-token",
        "unregistered",
        "not-registered",
    )
    return any(m in code or m in text for m in markers)


def _chunks(items: Sequence[str], size: int) -> Iterable[Sequence[str]]:
    for i in range(0, len(items), size):
        yield items[i : i + size]
