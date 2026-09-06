"""Firebase Cloud Messaging (FCM) delivery service.

Reusable low-level send helper. Notification Service remains the single entry
point for feature workflows; call sites must not send ad-hoc push payloads.
"""

from __future__ import annotations

import json
import os
import threading
from typing import Any, Iterable, List, Optional, Sequence, Tuple

from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)

_LOG_PREFIX = "[push-diag]"

_init_lock = threading.Lock()
_firebase_ready: Optional[bool] = None
_firebase_project_id: Optional[str] = None
_firebase_init_error: Optional[str] = None


def initialize_firebase() -> bool:
    """Public init probe used at process startup for diagnostic logs."""
    return _ensure_firebase_app()


def is_fcm_configured() -> bool:
    return bool(
        (settings.FIREBASE_CREDENTIALS_PATH or "").strip()
        or (settings.FIREBASE_CREDENTIALS_JSON or "").strip()
    )


def _credentials_source() -> str:
    if (settings.FIREBASE_CREDENTIALS_PATH or "").strip():
        return "path"
    if (settings.FIREBASE_CREDENTIALS_JSON or "").strip():
        return "json"
    return "none"


def _safe_project_id_from_credentials() -> Optional[str]:
    """Read project_id from configured credentials without logging secrets."""
    path = (settings.FIREBASE_CREDENTIALS_PATH or "").strip()
    raw_json = (settings.FIREBASE_CREDENTIALS_JSON or "").strip()
    try:
        if path:
            if not os.path.isfile(path):
                return None
            with open(path, encoding="utf-8") as handle:
                data = json.load(handle)
        elif raw_json:
            data = json.loads(raw_json)
        else:
            return None
        project_id = data.get("project_id") if isinstance(data, dict) else None
        return str(project_id) if project_id else None
    except Exception as exc:
        logger.warning(
            "%s Failed to read Firebase project_id from credentials type=%s error=%s",
            _LOG_PREFIX,
            type(exc).__name__,
            str(exc),
        )
        return None


def describe_firebase_status() -> dict[str, Any]:
    """Non-secret Firebase/FCM runtime status for diagnostic logs."""
    path = (settings.FIREBASE_CREDENTIALS_PATH or "").strip()
    source = _credentials_source()
    path_exists: Optional[bool] = os.path.isfile(path) if source == "path" else None
    json_parse_ok: Optional[bool] = None
    if source == "json":
        try:
            parsed = json.loads((settings.FIREBASE_CREDENTIALS_JSON or "").strip())
            json_parse_ok = isinstance(parsed, dict)
        except Exception:
            json_parse_ok = False
    return {
        "environment": settings.ENVIRONMENT,
        "configured": is_fcm_configured(),
        "credentials_source": source,
        "credentials_path_exists": path_exists,
        "credentials_json_parse_ok": json_parse_ok,
        "initialized": _firebase_ready,
        "project_id": _firebase_project_id or _safe_project_id_from_credentials(),
        "init_error": _firebase_init_error,
    }


def log_firebase_status(reason: str) -> dict[str, Any]:
    status = describe_firebase_status()
    logger.info(
        "%s Firebase status reason=%s environment=%s configured=%s "
        "credentials_source=%s path_exists=%s json_parse_ok=%s "
        "initialized=%s project_id=%s init_error=%s",
        _LOG_PREFIX,
        reason,
        status["environment"],
        status["configured"],
        status["credentials_source"],
        status["credentials_path_exists"],
        status["credentials_json_parse_ok"],
        status["initialized"],
        status["project_id"] or "(unknown)",
        status["init_error"] or "(none)",
    )
    return status


def _ensure_firebase_app() -> bool:
    """Initialize firebase-admin once. Returns False when unconfigured or init fails."""
    global _firebase_ready, _firebase_project_id, _firebase_init_error
    if _firebase_ready is not None:
        return _firebase_ready

    with _init_lock:
        if _firebase_ready is not None:
            return _firebase_ready

        if not is_fcm_configured():
            _firebase_init_error = "Firebase credentials are not configured"
            logger.warning(
                "%s Firebase initialization skipped: credentials not configured "
                "(set FIREBASE_CREDENTIALS_JSON or FIREBASE_CREDENTIALS_PATH) environment=%s",
                _LOG_PREFIX,
                settings.ENVIRONMENT,
            )
            _firebase_ready = False
            return False

        try:
            import firebase_admin
            from firebase_admin import credentials

            path = (settings.FIREBASE_CREDENTIALS_PATH or "").strip()
            raw_json = (settings.FIREBASE_CREDENTIALS_JSON or "").strip()
            source = _credentials_source()

            if source == "path" and not os.path.isfile(path):
                _firebase_init_error = "FIREBASE_CREDENTIALS_PATH file not found"
                logger.error(
                    "%s Firebase initialization failed: credentials file does not exist "
                    "source=path environment=%s",
                    _LOG_PREFIX,
                    settings.ENVIRONMENT,
                )
                _firebase_ready = False
                return False

            if firebase_admin._apps:
                _firebase_ready = True
                try:
                    _firebase_project_id = firebase_admin.get_app().project_id
                except Exception:
                    _firebase_project_id = _safe_project_id_from_credentials()
                logger.info(
                    "%s Firebase already initialized project_id=%s environment=%s",
                    _LOG_PREFIX,
                    _firebase_project_id or "(unknown)",
                    settings.ENVIRONMENT,
                )
                return True

            if path:
                cred = credentials.Certificate(path)
            else:
                cred = credentials.Certificate(json.loads(raw_json))
            app = firebase_admin.initialize_app(cred)
            _firebase_ready = True
            _firebase_init_error = None
            _firebase_project_id = getattr(app, "project_id", None) or _safe_project_id_from_credentials()
            logger.info(
                "%s Firebase initialization success project_id=%s source=%s environment=%s",
                _LOG_PREFIX,
                _firebase_project_id or "(unknown)",
                source,
                settings.ENVIRONMENT,
            )
            return True
        except Exception as exc:
            _firebase_init_error = f"{type(exc).__name__}: {exc}"
            logger.exception(
                "%s Firebase initialization failed type=%s error=%s environment=%s",
                _LOG_PREFIX,
                type(exc).__name__,
                str(exc),
                settings.ENVIRONMENT,
            )
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
    token_count = len(cleaned)
    if not cleaned:
        logger.info("%s FCM send skipped: token_count=0", _LOG_PREFIX)
        return 0, 0, []

    ready = _ensure_firebase_app()
    status = describe_firebase_status()
    if not ready:
        logger.warning(
            "%s FCM send skipped: Firebase not ready token_count=%s "
            "configured=%s initialized=%s project_id=%s init_error=%s",
            _LOG_PREFIX,
            token_count,
            status["configured"],
            status["initialized"],
            status["project_id"] or "(unknown)",
            status["init_error"] or "(none)",
        )
        return 0, token_count, []

    try:
        from firebase_admin import messaging
    except Exception as exc:
        logger.exception(
            "%s firebase_admin.messaging import failed type=%s error=%s",
            _LOG_PREFIX,
            type(exc).__name__,
            str(exc),
        )
        return 0, token_count, []

    payload_data = {str(k): str(v) for k, v in (data or {}).items()}
    success = 0
    failure = 0
    invalid: List[str] = []
    message_ids: List[str] = []

    logger.info(
        "%s FCM send attempted token_count=%s project_id=%s environment=%s",
        _LOG_PREFIX,
        token_count,
        status["project_id"] or "(unknown)",
        settings.ENVIRONMENT,
    )

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
                    mid = getattr(send_response, "message_id", None)
                    if mid:
                        message_ids.append(str(mid))
                    continue
                exc = send_response.exception
                code = getattr(exc, "code", None) or ""
                exc_type = type(exc).__name__ if exc is not None else "None"
                msg = str(exc) if exc else "unknown"
                logger.warning(
                    "%s FCM send failed for one token index=%s type=%s code=%s error=%s",
                    _LOG_PREFIX,
                    idx,
                    exc_type,
                    code,
                    msg,
                )
                if _is_invalid_token_error(exc):
                    invalid.append(chunk[idx])
        except Exception as exc:
            logger.exception(
                "%s FCM multicast send failed token_count=%s type=%s error=%s",
                _LOG_PREFIX,
                len(chunk),
                type(exc).__name__,
                str(exc),
            )
            failure += len(chunk)

    logger.info(
        "%s FCM response token_count=%s success=%s failure=%s invalid=%s "
        "message_ids=%s project_id=%s",
        _LOG_PREFIX,
        token_count,
        success,
        failure,
        len(invalid),
        message_ids[:20],
        status["project_id"] or "(unknown)",
    )
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
