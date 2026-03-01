import json
import re
from sqlalchemy.orm import Session
from app.models.role import Role
from app.schemas.ai import InterpretResponse
from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)

ALLOWED_INTENTS = {"ADD_ROLE", "UPDATE_ROLE", "DELETE_ROLE", "VIEW_ROLES"}
SYSTEM_PROMPT = """You are a strict role-management classifier. Output ONLY valid JSON, no other text.
Allowed intents: ADD_ROLE, UPDATE_ROLE, DELETE_ROLE, VIEW_ROLES. Reject other requests with intent VIEW_ROLES and action NAVIGATE.
Rules: ADD_ROLE->POST /roles, payload {code, name, scope_type, tenant_id, permission_ids, feature_ids, menu_ids}. UPDATE_ROLE->PUT /roles/{id}, payload {name or other fields}. DELETE_ROLE->DELETE /roles/{id}. VIEW_ROLES->NAVIGATE /roles.
Output format exactly: {"intent":"...","action":"CALL_API|NAVIGATE","method":"POST|PUT|DELETE|GET|null","endpoint":"...","payload":{}}.
For role name in user text use it as-is; code must be UPPERCASE no spaces. scope_type Platform, tenant_id null, permission_ids [], feature_ids [], menu_ids [] if not specified."""

USER_PROMPT_TEMPLATE = "User said: {user_text}"


def _sanitize(text: str) -> str:
    return re.sub(r"[^\w\s.,\-'']", "", text)[:500]


def _call_llm(user_text: str) -> dict:
    if not getattr(settings, "OPENAI_API_KEY", None) or not settings.OPENAI_API_KEY.strip():
        return {"intent": "VIEW_ROLES", "action": "NAVIGATE", "method": None, "endpoint": "/roles", "payload": {}}
    try:
        import openai
        client = openai.OpenAI(api_key=settings.OPENAI_API_KEY.strip())
        sanitized = _sanitize(user_text)
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": USER_PROMPT_TEMPLATE.format(user_text=sanitized)},
            ],
            max_tokens=300,
            temperature=0,
        )
        raw = (resp.choices[0].message.content or "").strip()
        raw = re.sub(r"^```\w*\n?", "", raw)
        raw = re.sub(r"\n?```\s*$", "", raw)
        data = json.loads(raw)
        intent = data.get("intent") or "VIEW_ROLES"
        if intent not in ALLOWED_INTENTS:
            intent = "VIEW_ROLES"
        action = data.get("action") or ("NAVIGATE" if intent == "VIEW_ROLES" else "CALL_API")
        method = data.get("method")
        endpoint = data.get("endpoint") or "/roles"
        payload = data.get("payload") or {}
        return {"intent": intent, "action": action, "method": method, "endpoint": endpoint, "payload": payload}
    except Exception as e:
        logger.warning(f"LLM call failed: {e}")
        return {"intent": "VIEW_ROLES", "action": "NAVIGATE", "method": None, "endpoint": "/roles", "payload": {}}


def resolve_role_id_by_name(db: Session, name: str) -> int | None:
    if not name or not name.strip():
        return None
    role = db.query(Role).filter(Role.is_deleted == False, Role.name.ilike(name.strip())).first()
    return role.id if role else None


def interpret(db: Session, user_text: str) -> InterpretResponse:
    if not user_text or not user_text.strip():
        return InterpretResponse(intent="VIEW_ROLES", action="NAVIGATE", method=None, endpoint="/roles", payload={})
    data = _call_llm(user_text)
    intent = data["intent"]
    action = data["action"]
    method = data["method"]
    endpoint = data["endpoint"]
    payload = data["payload"]

    if intent == "UPDATE_ROLE":
        role_name = (payload.get("role_name") or payload.get("name") or "").strip() or next(
            (str(v) for k, v in payload.items() if "role" in k.lower() and "name" in k.lower()), ""
        )
        if not role_name and isinstance(payload.get("from"), str):
            role_name = payload["from"]
        role_id = resolve_role_id_by_name(db, role_name)
        if role_id is None:
            return InterpretResponse(
                intent="UPDATE_ROLE",
                action="CALL_API",
                method="PUT",
                endpoint="/roles/0",
                payload={"error": "role_not_found", "message": f"Role not found: {role_name or 'unknown'}"},
            )
        endpoint = f"/roles/{role_id}"
        payload.pop("role_name", None)
        payload.pop("from", None)
    elif intent == "DELETE_ROLE":
        role_name = (payload.get("role_name") or payload.get("name") or "").strip() or next(
            (str(v) for k, v in payload.items() if "role" in k.lower()), ""
        )
        role_id = resolve_role_id_by_name(db, role_name)
        if role_id is None:
            return InterpretResponse(
                intent="DELETE_ROLE",
                action="CALL_API",
                method="DELETE",
                endpoint="/roles/0",
                payload={"error": "role_not_found", "message": f"Role not found: {role_name or 'unknown'}"},
            )
        endpoint = f"/roles/{role_id}"
        payload = {}

    if intent == "ADD_ROLE" and isinstance(payload, dict):
        payload.setdefault("scope_type", "Platform")
        payload.setdefault("tenant_id", None)
        payload.setdefault("permission_ids", [])
        payload.setdefault("feature_ids", [])
        payload.setdefault("menu_ids", [])
        code = payload.get("code")
        if not code and payload.get("name"):
            payload["code"] = str(payload["name"]).upper().replace(" ", "_")

    return InterpretResponse(intent=intent, action=action, method=method, endpoint=endpoint, payload=payload)
