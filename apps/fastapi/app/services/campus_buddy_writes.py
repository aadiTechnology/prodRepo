"""Create domain records from Campus Buddy chat (not page navigation)."""

from __future__ import annotations

import re
from typing import Any

from sqlalchemy.orm import Session

from app.schemas.ai import InterpretResponse
from app.services.chatbot_actions.errors import ChatbotActionError
from app.services.chatbot_actions.homework import add_homework
from app.services import homework_service

_CREATE_HOMEWORK = re.compile(
    r"^\s*(?:please\s+)?(?P<verb>add|assign|assing|create|new)\s+(?:a\s+)?"
    r"homework\b(?:\s+(?:titled|title|called|named|:|-))?\s*(?P<title>.*)$",
    re.IGNORECASE,
)

_LOCAL_USAGE = {"provider": "local", "prompt": 0, "completion": 0, "total": 0}


def try_write_from_chat(
    db: Session, user: Any, user_text: str
) -> tuple[InterpretResponse, dict] | None:
    """If the user asked to create a record, do it and return a chat reply."""
    homework = _try_add_homework(db, user, user_text)
    if homework is not None:
        return homework, dict(_LOCAL_USAGE)
    return None


def _try_add_homework(
    db: Session, user: Any, user_text: str
) -> InterpretResponse | None:
    match = _CREATE_HOMEWORK.match(user_text or "")
    if not match:
        return None
    title = (match.group("title") or "").strip(" \t.-:")
    title = re.sub(r"\s+", " ", title)
    if not title:
        return None

    classes = homework_service.get_classes_for_teacher(
        db, tenant_id=user.tenant_id, user_id=user.id
    )
    if not classes:
        return _message(
            "I could not find a class to assign homework to. "
            "Please assign a class to your teacher profile first.",
            is_error=True,
        )

    class_opt = classes[0]
    class_id = int(class_opt.id)
    divisions = homework_service.get_divisions_for_teacher_class(
        db, tenant_id=user.tenant_id, user_id=user.id, class_id=class_id
    )
    division_id = None
    if divisions:
        first = divisions[0]
        division_id = int(first["id"] if isinstance(first, dict) else first.id)

    year_id = homework_service.resolve_current_academic_year_id(db, user.tenant_id)
    subjects = homework_service.get_subjects_for_teacher_class(
        db,
        tenant_id=user.tenant_id,
        user_id=user.id,
        class_id=class_id,
        academic_year_id=year_id,
    )
    if not subjects:
        return _message(
            "I need a subject to add homework. Please say the subject as well, "
            "for example: assign homework 1 to 20 numbers for Fun Activity.",
            is_error=True,
        )

    subject = subjects[0]
    payload: dict[str, Any] = {
        "title": title[:255],
        "class_id": class_id,
        "subject_id": int(subject.id),
        "status": "Active",
    }
    if division_id:
        payload["class_division_id"] = division_id
    if year_id:
        payload["academic_year_id"] = int(year_id)

    try:
        result = add_homework(db, user, payload)
    except ChatbotActionError as exc:
        return _message(exc.message, is_error=True)

    class_name = result.get("class_name") or class_opt.name
    subject_name = result.get("subject_name") or subject.name
    return _message(
        f"Homework added: {result.get('title') or title} "
        f"for {class_name} ({subject_name}).",
        is_error=False,
    )


def _message(
    text: str,
    *,
    is_error: bool,
    route: str = "",
    menu_name: str = "",
) -> InterpretResponse:
    return InterpretResponse(
        menu_id=None,
        menu_name=menu_name,
        parent_menu_id=None,
        parent_menu_name="",
        route=route,
        action="NAVIGATE",
        method=None,
        endpoint=None,
        payload={"result_message": text},
        requires_confirmation=False,
        error_type="SAFE_ERROR" if is_error else None,
        error_message=text if is_error else None,
        assistant_message=text,
    )
