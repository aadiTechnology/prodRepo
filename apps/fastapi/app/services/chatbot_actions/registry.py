"""Approved chatbot actions. LLM/rules may only call keys listed here."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from sqlalchemy.orm import Session

from app.services.chatbot_actions import attendance, fees, homework, notices
from app.services.chatbot_actions.errors import validation

ActionFn = Callable[[Session, Any, dict[str, Any]], dict[str, Any]]

_ALIASES = {
    "get_notice": "get_notices",
    "get_fee": "get_fee_status",
    "create_homework": "add_homework",
    "mark_attendance": "add_attendance",
}

ACTIONS: dict[str, ActionFn] = {
    "get_homework": homework.get_homework,
    "add_homework": homework.add_homework,
    "get_attendance": attendance.get_attendance,
    "add_attendance": attendance.add_attendance,
    "get_notices": notices.get_notices,
    "get_fee_status": fees.get_fee_status,
}


def normalize_action_key(action_key: str) -> str:
    key = (action_key or "").strip()
    return _ALIASES.get(key, key)


def execute_action(
    db: Session,
    current_user: Any,
    action_key: str,
    payload: dict[str, Any] | None,
) -> dict[str, Any]:
    key = normalize_action_key(action_key)
    handler = ACTIONS.get(key)
    if handler is None:
        raise validation("That action is not available.")
    return handler(db, current_user, payload or {})
