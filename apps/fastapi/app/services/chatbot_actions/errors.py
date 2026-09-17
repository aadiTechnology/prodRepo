"""Safe errors for the chatbot action API (never leak internals)."""

from __future__ import annotations

from fastapi import HTTPException

from app.core.exceptions import AppException, ForbiddenException, NotFoundException, UnauthorizedException, ValidationException

UNAUTHENTICATED = "unauthenticated"
FORBIDDEN = "forbidden"
NOT_FOUND = "not_found"
NO_LINKED_STUDENT = "no_linked_student"
VALIDATION = "validation"


class ChatbotActionError(Exception):
    """User-safe action failure returned to the central chatbot."""

    def __init__(self, code: str, message: str, *, status_code: int) -> None:
        self.code = code
        self.message = message
        self.status_code = status_code
        super().__init__(message)


def unauthenticated(message: str = "Please sign in to continue.") -> ChatbotActionError:
    return ChatbotActionError(UNAUTHENTICATED, message, status_code=401)


def forbidden(message: str = "You do not have access to this information.") -> ChatbotActionError:
    return ChatbotActionError(FORBIDDEN, message, status_code=403)


def not_found(message: str = "No matching records were found.") -> ChatbotActionError:
    return ChatbotActionError(NOT_FOUND, message, status_code=404)


def no_linked_student(
    message: str = "No student is linked to this account.",
) -> ChatbotActionError:
    return ChatbotActionError(NO_LINKED_STUDENT, message, status_code=404)


def validation(message: str) -> ChatbotActionError:
    return ChatbotActionError(VALIDATION, message, status_code=422)


def from_exception(exc: BaseException) -> ChatbotActionError:
    """Map domain/HTTP errors to chatbot codes without forwarding internals."""
    if isinstance(exc, ChatbotActionError):
        return exc
    if isinstance(exc, UnauthorizedException):
        return unauthenticated()
    if isinstance(exc, ForbiddenException):
        return forbidden()
    if isinstance(exc, NotFoundException):
        return not_found()
    if isinstance(exc, ValidationException):
        return validation(_safe_validation_message(exc.message))
    if isinstance(exc, HTTPException):
        status = int(exc.status_code)
        if status == 401:
            return unauthenticated()
        if status == 403:
            return forbidden()
        if status == 404:
            return not_found()
        if status in (400, 409, 422):
            return validation(_safe_http_detail(exc.detail))
        return ChatbotActionError(
            "error",
            "Something went wrong while completing that action.",
            status_code=500,
        )
    if isinstance(exc, AppException):
        if exc.status_code == 401:
            return unauthenticated()
        if exc.status_code == 403:
            return forbidden()
        if exc.status_code == 404:
            return not_found()
        if exc.status_code in (400, 409, 422):
            return validation(_safe_validation_message(exc.message))
    return ChatbotActionError(
        "error",
        "Something went wrong while completing that action.",
        status_code=500,
    )


def _safe_validation_message(message: str) -> str:
    text = (message or "").strip()
    lowered = text.lower()
    if not text or any(
        token in lowered
        for token in ("sql", "traceback", "odbc", "pyodbc", "constraint", "driver")
    ):
        return "Some of the requested details were invalid."
    return text[:300]


def _safe_http_detail(detail: object) -> str:
    if isinstance(detail, str):
        return _safe_validation_message(detail)
    return "Some of the requested details were invalid."
