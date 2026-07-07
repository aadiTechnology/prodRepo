import json
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.models.ai_assistant_chat import AiAssistantMessage, AiAssistantSession
from app.models.user import User
from app.schemas.ai import InterpretResponse, SaveChatMessageRequest


def _user_id(user: User) -> int:
    return int(user.id)  # type: ignore[return-value]


def _tenant_id(user: User) -> int | None:
    tid = user.tenant_id
    return int(tid) if tid is not None else None  # type: ignore[arg-type]


def get_or_create_active_session(
    db: Session,
    user: User,
    *,
    impersonated_by: int | None = None,
) -> AiAssistantSession:
    uid = _user_id(user)
    session = (
        db.query(AiAssistantSession)
        .filter(
            AiAssistantSession.user_id == uid,
            AiAssistantSession.is_active == True,  # noqa: E712
            AiAssistantSession.is_deleted == False,  # noqa: E712
        )
        .order_by(AiAssistantSession.id.desc())
        .first()
    )
    if session:
        return session

    session = AiAssistantSession(
        user_id=uid,
        tenant_id=_tenant_id(user),
        title="Navigation Assistant",
        is_active=True,
        message_count=0,
        impersonated_by=impersonated_by,
        created_by=uid,
    )
    db.add(session)
    db.flush()
    return session


def _find_duplicate_message(
    db: Session,
    session_id: int,
    client_message_id: str | None,
) -> AiAssistantMessage | None:
    if not client_message_id:
        return None
    return (
        db.query(AiAssistantMessage)
        .filter(
            AiAssistantMessage.session_id == session_id,
            AiAssistantMessage.client_message_id == client_message_id,
            AiAssistantMessage.is_deleted == False,  # noqa: E712
        )
        .first()
    )


def _touch_session(session: AiAssistantSession) -> None:
    session.last_message_at = datetime.utcnow()
    session.updated_at = datetime.utcnow()
    session.message_count = int(session.message_count or 0) + 1


def append_message(
    db: Session,
    user: User,
    body: SaveChatMessageRequest,
    *,
    impersonated_by: int | None = None,
) -> AiAssistantMessage:
    session = get_or_create_active_session(db, user, impersonated_by=impersonated_by)
    existing = _find_duplicate_message(db, int(session.id), body.client_message_id)
    if existing:
        return existing

    interpret_json: str | None = None
    if body.interpret_response is not None:
        interpret_json = json.dumps(body.interpret_response, ensure_ascii=False)

    msg = AiAssistantMessage(
        session_id=int(session.id),
        user_id=_user_id(user),
        tenant_id=_tenant_id(user),
        role=body.role,
        message_text=body.message_text.strip(),
        is_error=body.is_error,
        input_source=body.input_source,
        client_message_id=body.client_message_id,
        action=body.action,
        menu_id=body.menu_id,
        menu_name=body.menu_name,
        parent_menu_id=body.parent_menu_id,
        parent_menu_name=body.parent_menu_name,
        route=body.route,
        error_type=body.error_type,
        error_message=body.error_message,
        interpret_response_json=interpret_json,
        created_by=_user_id(user),
    )
    db.add(msg)
    _touch_session(session)
    db.commit()
    db.refresh(msg)
    return msg


def list_messages(
    db: Session,
    user: User,
    *,
    limit: int = 100,
) -> tuple[AiAssistantSession, list[AiAssistantMessage]]:
    uid = _user_id(user)
    session = get_or_create_active_session(db, user)
    rows = (
        db.query(AiAssistantMessage)
        .filter(
            AiAssistantMessage.session_id == int(session.id),
            AiAssistantMessage.user_id == uid,
            AiAssistantMessage.is_deleted == False,  # noqa: E712
        )
        .order_by(AiAssistantMessage.created_at.asc(), AiAssistantMessage.id.asc())
        .limit(limit)
        .all()
    )
    return session, rows


def clear_chat(
    db: Session,
    user: User,
    *,
    impersonated_by: int | None = None,
) -> AiAssistantSession:
    uid = _user_id(user)
    now = datetime.utcnow()
    active = (
        db.query(AiAssistantSession)
        .filter(
            AiAssistantSession.user_id == uid,
            AiAssistantSession.is_active == True,  # noqa: E712
            AiAssistantSession.is_deleted == False,  # noqa: E712
        )
        .all()
    )
    for session in active:
        session.is_active = False
        session.updated_at = now
        session.updated_by = uid
        (
            db.query(AiAssistantMessage)
            .filter(
                AiAssistantMessage.session_id == int(session.id),
                AiAssistantMessage.is_deleted == False,  # noqa: E712
            )
            .update(
                {
                    AiAssistantMessage.is_deleted: True,
                    AiAssistantMessage.deleted_at: now,
                    AiAssistantMessage.deleted_by: uid,
                },
                synchronize_session=False,
            )
        )

    new_session = AiAssistantSession(
        user_id=uid,
        tenant_id=_tenant_id(user),
        title="Navigation Assistant",
        is_active=True,
        message_count=0,
        impersonated_by=impersonated_by,
        created_by=uid,
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return new_session


def _assistant_text_from_interpret(response: InterpretResponse) -> tuple[str, bool]:
    if response.error_type and response.error_message:
        return response.error_message, True
    if response.action == "CALL_API":
        return "Navigation only — try saying or typing 'open [page name]'.", True
    if response.action == "NAVIGATE" and response.route:
        label = response.menu_name or response.route
        return f"Opening {label}.", False
    return "Please specify which page you want to open.", True


def persist_interpret_exchange(
    db: Session,
    user: User,
    user_text: str,
    response: InterpretResponse,
    *,
    input_source: str | None = None,
    client_message_id: str | None = None,
    impersonated_by: int | None = None,
    usage: dict | None = None,
) -> None:
    session = get_or_create_active_session(db, user, impersonated_by=impersonated_by)
    uid = _user_id(user)
    now = datetime.utcnow()

    user_client_id = client_message_id or f"user-{int(session.id)}-{int(now.timestamp() * 1000)}"
    if not _find_duplicate_message(db, int(session.id), user_client_id):
        user_msg = AiAssistantMessage(
            session_id=int(session.id),
            user_id=uid,
            tenant_id=_tenant_id(user),
            role="user",
            message_text=user_text.strip(),
            is_error=False,
            input_source=input_source or "text",
            client_message_id=user_client_id,
            created_by=uid,
        )
        db.add(user_msg)
        _touch_session(session)

    assistant_text, is_error = _assistant_text_from_interpret(response)
    response_payload: dict[str, Any] = response.model_dump()
    assistant_client_id = f"{user_client_id}-assistant"
    if not _find_duplicate_message(db, int(session.id), assistant_client_id):
        assistant_msg = AiAssistantMessage(
            session_id=int(session.id),
            user_id=uid,
            tenant_id=_tenant_id(user),
            role="assistant",
            message_text=assistant_text,
            is_error=is_error,
            input_source="interpret",
            client_message_id=assistant_client_id,
            action=response.action,
            menu_id=response.menu_id,
            menu_name=response.menu_name or None,
            parent_menu_id=response.parent_menu_id,
            parent_menu_name=response.parent_menu_name or None,
            route=response.route or None,
            error_type=response.error_type,
            error_message=response.error_message,
            interpret_response_json=json.dumps(response_payload, ensure_ascii=False),
            llm_provider=(usage or {}).get("provider"),
            tokens_prompt=(usage or {}).get("prompt"),
            tokens_completion=(usage or {}).get("completion"),
            tokens_total=(usage or {}).get("total"),
            created_by=uid,
        )
        db.add(assistant_msg)
        _touch_session(session)

    db.commit()
