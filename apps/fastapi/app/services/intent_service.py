import json
import re
from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.ai import InterpretResponse
from app.core.config import settings
from app.core.logging_config import get_logger
from app.services.rbac_service import get_allowed_menus_tree_for_ai

logger = get_logger(__name__)

USER_PROMPT_TEMPLATE = "User said: {user_text}"


def _sanitize(text: str) -> str:
    return re.sub(r"[^\w\s.,\-'']", "", text)[:500]


def _build_system_prompt(allowed_menus: list[dict]) -> str:
    menus_json = json.dumps(allowed_menus, indent=2)
    return f"""You are an ERP assistant. Use ONLY the following allowed menus. Output ONLY valid JSON.

AllowedMenus = {menus_json}

Rules:
- Map user request to exactly one menu from AllowedMenus.
- For "open X", "go to X", "show X", "navigate to X" return that menu with action="NAVIGATE".
- Include menu_id, menu_name, parent_menu_id, parent_menu_name, route from the chosen menu.
- If no match or unclear return: {{"error_type":"NEED_CLARIFICATION","error_message":"Please specify the screen."}}
- If not in AllowedMenus return: {{"error_type":"SAFE_ERROR","error_message":"Access not allowed."}}

Output format exactly:
{{"menu_id":<int>,"menu_name":"<name>","parent_menu_id":<int or null>,"parent_menu_name":"<name or empty>","route":"<path>","action":"NAVIGATE|CALL_API","method":null,"endpoint":null,"payload":{{}},"requires_confirmation":false}}
For errors: {{"menu_id":null,"menu_name":"","parent_menu_id":null,"parent_menu_name":"","route":"","action":"NAVIGATE","method":null,"endpoint":null,"payload":{{}},"requires_confirmation":false,"error_type":"SAFE_ERROR|NEED_CLARIFICATION","error_message":"..."}}
"""


def _call_llm(user_text: str, allowed_menus: list[dict]) -> dict:
    if not getattr(settings, "OPENAI_API_KEY", None) or not settings.OPENAI_API_KEY.strip():
        if allowed_menus:
            m = allowed_menus[0]
            return {
                "menu_id": m.get("menu_id"),
                "menu_name": m.get("menu_name", ""),
                "parent_menu_id": m.get("parent_menu_id"),
                "parent_menu_name": m.get("parent_menu_name", ""),
                "route": m.get("route", ""),
                "action": "NAVIGATE",
                "method": None,
                "endpoint": None,
                "payload": {},
                "requires_confirmation": False,
                "error_type": None,
                "error_message": None,
            }
        return {
            "menu_id": None,
            "menu_name": "",
            "parent_menu_id": None,
            "parent_menu_name": "",
            "route": "",
            "action": "NAVIGATE",
            "method": None,
            "endpoint": None,
            "payload": {},
            "requires_confirmation": False,
            "error_type": "SAFE_ERROR",
            "error_message": "No menus available.",
        }
    try:
        import openai
        client = openai.OpenAI(api_key=settings.OPENAI_API_KEY.strip())
        sanitized = _sanitize(user_text)
        system = _build_system_prompt(allowed_menus)
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": USER_PROMPT_TEMPLATE.format(user_text=sanitized)},
            ],
            max_tokens=350,
            temperature=0,
            response_format={"type": "json_object"},
        )
        raw = (resp.choices[0].message.content or "").strip()
        raw = re.sub(r"^```\w*\n?", "", raw)
        raw = re.sub(r"\n?```\s*$", "", raw)
        data = json.loads(raw)
        menu_id = data.get("menu_id")
        if menu_id is not None and not isinstance(menu_id, int):
            try:
                menu_id = int(menu_id)
            except (TypeError, ValueError):
                menu_id = None
        parent_menu_id = data.get("parent_menu_id")
        if parent_menu_id is not None and not isinstance(parent_menu_id, int):
            try:
                parent_menu_id = int(parent_menu_id)
            except (TypeError, ValueError):
                parent_menu_id = None
        return {
            "menu_id": menu_id,
            "menu_name": (data.get("menu_name") or "").strip(),
            "parent_menu_id": parent_menu_id,
            "parent_menu_name": (data.get("parent_menu_name") or "").strip(),
            "route": (data.get("route") or "").strip(),
            "action": data.get("action") or "NAVIGATE",
            "method": data.get("method"),
            "endpoint": data.get("endpoint"),
            "payload": data.get("payload") or {},
            "requires_confirmation": bool(data.get("requires_confirmation")),
            "error_type": data.get("error_type"),
            "error_message": data.get("error_message"),
        }
    except Exception as e:
        logger.warning(f"LLM call failed: {e}")
        return {
            "menu_id": None,
            "menu_name": "",
            "parent_menu_id": None,
            "parent_menu_name": "",
            "route": "",
            "action": "NAVIGATE",
            "method": None,
            "endpoint": None,
            "payload": {},
            "requires_confirmation": False,
            "error_type": "SAFE_ERROR",
            "error_message": "Request could not be processed.",
        }


def _validate_response(data: dict, allowed_menus: list[dict]) -> dict:
    if data.get("error_type"):
        return data
    allowed_ids = {m["menu_id"] for m in allowed_menus}
    menu_id = data.get("menu_id")
    if menu_id is not None and menu_id not in allowed_ids:
        return {
            **data,
            "menu_id": None,
            "menu_name": "",
            "parent_menu_id": None,
            "parent_menu_name": "",
            "route": "",
            "error_type": "SAFE_ERROR",
            "error_message": "Access not allowed.",
        }
    route = (data.get("route") or "").strip()
    if route and not route.startswith("/"):
        data["route"] = "/" + route
    return data


def interpret(db: Session, user: User, user_text: str) -> InterpretResponse:
    if not user_text or not user_text.strip():
        menus = get_allowed_menus_tree_for_ai(db, user)
        if menus:
            m = menus[0]
            return InterpretResponse(
                menu_id=m.get("menu_id"),
                menu_name=m.get("menu_name", ""),
                parent_menu_id=m.get("parent_menu_id"),
                parent_menu_name=m.get("parent_menu_name", ""),
                route=(m.get("route") or "").strip() or "/",
                action="NAVIGATE",
                method=None,
                endpoint=None,
                payload={},
                requires_confirmation=False,
            )
        return InterpretResponse(
            menu_id=None,
            menu_name="",
            parent_menu_id=None,
            parent_menu_name="",
            route="/",
            action="NAVIGATE",
            method=None,
            endpoint=None,
            payload={},
            requires_confirmation=False,
            error_type="SAFE_ERROR",
            error_message="No menus available.",
        )
    allowed_menus = get_allowed_menus_tree_for_ai(db, user)
    if not allowed_menus:
        return InterpretResponse(
            menu_id=None,
            menu_name="",
            parent_menu_id=None,
            parent_menu_name="",
            route="/",
            action="NAVIGATE",
            method=None,
            endpoint=None,
            payload={},
            requires_confirmation=False,
            error_type="SAFE_ERROR",
            error_message="No menus available.",
        )
    data = _call_llm(user_text, allowed_menus)
    data = _validate_response(data, allowed_menus)
    route = (data.get("route") or "").strip()
    if route and not route.startswith("/"):
        route = "/" + route
    return InterpretResponse(
        menu_id=data.get("menu_id"),
        menu_name=data.get("menu_name") or "",
        parent_menu_id=data.get("parent_menu_id"),
        parent_menu_name=data.get("parent_menu_name") or "",
        route=route,
        action=data.get("action") or "NAVIGATE",
        method=data.get("method"),
        endpoint=data.get("endpoint"),
        payload=data.get("payload") or {},
        requires_confirmation=data.get("requires_confirmation") or False,
        error_type=data.get("error_type"),
        error_message=data.get("error_message"),
    )
