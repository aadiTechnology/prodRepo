import json
import re
from typing import Any

import openai
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.ai import InterpretResponse, InterpretOption
from app.core.config import settings
from app.core.logging_config import get_logger
from app.services.rbac_service import get_allowed_menus_tree_for_ai, resolve_user_permissions_and_menus
from app.services.ai_tenant_config_service import get_ai_tenant_plan
from app.services.ai_permission_sync_service import (
    resolve_effective_llm_enabled,
    user_has_llm_permission,
    user_has_ai_assistant_access,
    ensure_ai_tenant_plan_synced,
)

logger = get_logger(__name__)

USER_PROMPT_TEMPLATE = "User said: {user_text}"

HUB_CHILD_MODULE_NAMES = frozenset({"User Related", "Academics", "Fees Related"})
_NAV_PREFIXES = ("open ", "go to ", "show ", "navigate to ", "take me to ", "create ", "add ", "new ")

# Create/action routes (require :create permission; not in sidebar menu catalog).
NAV_ACTION_PAGES: list[dict[str, str]] = [
    {"menu_name": "Add Teacher", "route": "/teachers/add", "permission": "TEACHER_MGMT:create"},
    {"menu_name": "Add User", "route": "/user/create", "permission": "ADMIN_MGMT:create"},
    {"menu_name": "Add Class", "route": "/classes/new", "permission": "ACADEMIC_MGMT:create"},
    {"menu_name": "Add Subject", "route": "/subjects/new", "permission": "ACADEMIC_MGMT:create"},
    {"menu_name": "Add Academic Year", "route": "/academic-years/new", "permission": "ACADEMIC_MGMT:create"},
    {"menu_name": "Add Fee Category", "route": "/fees/categories/add", "permission": "FEE_MGMT:create"},
    {"menu_name": "Add Role", "route": "/roles/create", "permission": "ADMIN_MGMT:create"},
    {"menu_name": "Add Fee Structure", "route": "/fees/setup/add", "permission": "FEE_MGMT:create"},
    {"menu_name": "Create Notice", "route": "/communication/notices/new", "permission": "COMMUNICATION_MGMT:create"},
    {"menu_name": "Assign Class Teacher", "route": "/teacher-assignments/assign", "permission": "ADMIN_MGMT:create"},
]

_SAFE_ERROR_NOT_CONFIGURED = {
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
    "error_message": "Assistant is not configured. Set NVIDIA_API_KEY or OPENAI_API_KEY in the FastAPI .env file.",
}


def _sanitize(text: str) -> str:
    return re.sub(r"[^\w\s.,\-'']", "", text)[:500]


def _path_from_name(name: str) -> str:
    if not name or not name.strip():
        return ""
    return "/" + name.strip().lower().replace(" ", "-").replace("_", "-")


def _is_synthetic_parent_route(name: str, route: str) -> bool:
    """Hub/parent modules without a real DB path get a slug route — not navigable."""
    if name.lower() in ("dashboard", "overview"):
        return False
    if route in ("", "/"):
        return True
    return route == _path_from_name(name)


def _dedupe_menus_by_route(menus: list[dict]) -> list[dict]:
    seen: set[str] = set()
    out: list[dict] = []
    for m in menus:
        route = (m.get("route") or "").strip()
        if not route or route in seen:
            continue
        seen.add(route)
        out.append(m)
    return out


def _append_action_pages(allowed_menus: list[dict], permission_codes: list[str]) -> list[dict]:
    perm_set = set(permission_codes)
    seen_routes = {(m.get("route") or "").strip() for m in allowed_menus}
    out = list(allowed_menus)
    for i, action in enumerate(NAV_ACTION_PAGES):
        if action["permission"] not in perm_set:
            continue
        route = action["route"]
        if route in seen_routes:
            continue
        out.append({
            "menu_id": -(1000 + i),
            "menu_name": action["menu_name"],
            "parent_menu_id": None,
            "parent_menu_name": "",
            "route": route,
        })
        seen_routes.add(route)
    return out


def _build_allowed_menus(db: Session, user: User) -> list[dict]:
    permission_codes, _ = resolve_user_permissions_and_menus(db, user)
    raw_menus = get_allowed_menus_tree_for_ai(db, user)
    filtered = _filter_menus_for_ai(raw_menus)
    deduped = _dedupe_menus_by_route(filtered)
    return _append_action_pages(deduped, permission_codes)


def _filter_menus_for_ai(allowed_menus: list[dict]) -> list[dict]:
    filtered: list[dict] = []
    for m in allowed_menus:
        name = (m.get("menu_name") or "").strip()
        if name in HUB_CHILD_MODULE_NAMES:
            continue
        route = (m.get("route") or "").strip()
        if ":" in route:
            continue
        if _is_synthetic_parent_route(name, route):
            continue
        if not route or route == "/":
            if name.lower() not in ("dashboard", "overview"):
                if not route:
                    continue
        filtered.append(m)
    return filtered


def _success_from_menu(menu: dict) -> dict:
    route = (menu.get("route") or "").strip()
    if route and not route.startswith("/"):
        route = "/" + route
    return {
        "menu_id": menu.get("menu_id"),
        "menu_name": (menu.get("menu_name") or "").strip(),
        "parent_menu_id": menu.get("parent_menu_id"),
        "parent_menu_name": (menu.get("parent_menu_name") or "").strip(),
        "route": route,
        "action": "NAVIGATE",
        "method": None,
        "endpoint": None,
        "payload": {},
        "requires_confirmation": False,
        "error_type": None,
        "error_message": None,
    }


def _normalize_query(text: str) -> str:
    t = text.lower().strip()
    for prefix in _NAV_PREFIXES:
        if t.startswith(prefix):
            t = t[len(prefix) :].strip()
    return t


# Filler words that carry no menu meaning in natural-language navigation phrases.
_STOPWORDS = frozenset({
    "a", "an", "the", "to", "of", "on", "in", "at", "for", "and", "or", "is", "are",
    "do", "does", "did", "how", "where", "wheres", "what", "which", "who", "can",
    "could", "would", "should", "i", "me", "my", "we", "you", "your", "want", "wanna",
    "need", "like", "see", "view", "show", "find", "look", "looking", "go", "going",
    "get", "getting", "open", "please", "kindly", "take", "bring", "navigate", "goto",
    "place", "area", "section", "page", "pages", "screen", "menu", "option", "options",
    "tab", "part", "thing", "here", "there", "this", "that", "into", "from", "give",
    "list",
})

# Map create-intent verbs to a single token so "create teacher" matches "Add Teacher".
_SYNONYMS = {
    "create": "add",
    "new": "add",
    "register": "add",
    "make": "add",
}


def _stem(word: str) -> str:
    """Very light stemmer: collapse simple plurals so teacher == teachers."""
    if len(word) > 4 and word.endswith("ies"):
        return word[:-3] + "y"
    if len(word) > 3 and word.endswith("es"):
        return word[:-2]
    if len(word) > 3 and word.endswith("s"):
        return word[:-1]
    return word


def _content_tokens(text: str) -> set[str]:
    """Meaningful words: lowercase, stopwords removed, synonyms + plurals normalized."""
    out: set[str] = set()
    for raw in re.findall(r"\w+", text.lower()):
        if raw in _STOPWORDS:
            continue
        word = _SYNONYMS.get(raw, raw)
        out.add(_stem(word))
    return out


def _local_match(user_text: str, allowed_menus: list[dict]) -> dict | None:
    """Match menu by name/path without calling the LLM (zero tokens)."""
    query = _normalize_query(user_text)
    if not query:
        return None

    navigable = [m for m in allowed_menus if (m.get("route") or "").strip()]

    exact = [m for m in navigable if m["menu_name"].lower() == query]
    if len(exact) == 1:
        return _success_from_menu(exact[0])

    if query.startswith("/"):
        by_path = [m for m in navigable if m["route"].lower() == query]
        if len(by_path) == 1:
            return _success_from_menu(by_path[0])

    partial = [
        m
        for m in navigable
        if query in m["menu_name"].lower() or m["menu_name"].lower() in query
    ]
    if len(partial) == 1:
        return _success_from_menu(partial[0])

    # Content-word overlap: handles verbose natural-language phrases like
    # "want to see teacher list" or "where i can create homework".
    query_content = _content_tokens(query)
    if not query_content:
        return None

    scored: list[tuple[float, int, dict]] = []
    for m in navigable:
        name_content = _content_tokens(m["menu_name"])
        if not name_content:
            continue
        overlap = query_content & name_content
        if not overlap:
            continue
        coverage = len(overlap) / len(name_content)  # how much of the menu name is matched
        score = len(overlap) * 10 + coverage * 5
        scored.append((score, len(overlap), m))

    if not scored:
        return None

    scored.sort(key=lambda x: (-x[0], -x[1], x[2]["menu_name"]))
    best_score, best_overlap, best_menu = scored[0]
    runner_score = scored[1][0] if len(scored) > 1 else -1.0
    fully_covers_name = best_overlap >= len(_content_tokens(best_menu["menu_name"]))

    # Navigate only when the winner is unambiguous: it either fully matches the
    # menu name or shares >=2 content words, AND clearly beats the runner-up.
    if (fully_covers_name or best_overlap >= 2) and best_score > runner_score:
        return _success_from_menu(best_menu)
    return None


def _rank_llm_candidates(query: str, menus: list[dict], limit: int) -> list[dict]:
    q = _normalize_query(query)
    q_words = set(re.findall(r"\w+", q))
    scored: list[tuple[int, dict]] = []
    for m in menus:
        name = m["menu_name"].lower()
        score = 0
        if q and q in name:
            score += 10
        name_words = set(re.findall(r"\w+", name))
        score += len(q_words & name_words) * 3
        if score > 0:
            scored.append((score, m))
    scored.sort(key=lambda x: (-x[0], x[1]["menu_name"]))
    if scored:
        return [m for _, m in scored[:limit]]
    return menus[:limit]


def _llm_failure_message(exc: Exception) -> str:
    err = str(exc).lower()
    if "insufficient_quota" in err or "exceeded your current quota" in err or "quota exceeded" in err:
        return (
            "AI quota exceeded. Check NVIDIA or OpenAI usage limits, then restart the API server."
        )
    if "invalid_api_key" in err or "incorrect api key" in err:
        return "Invalid AI API key. Update NVIDIA_API_KEY or OPENAI_API_KEY in the server .env file."
    if "429" in err:
        return "AI service is rate-limited. Please try again in a moment."
    if "json" in err or "expecting value" in err:
        return (
            "I couldn't match that page. Type a few letters and pick from the list, "
            "or use the exact page name (e.g. Homework, Users)."
        )
    return (
        "I couldn't find that page. Type to see matching pages you can access, "
        "then pick one or press Send."
    )


def _parse_llm_json(raw: str) -> dict:
    raw = re.sub(r"^```\w*\n?", "", raw.strip())
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
        "action": "NAVIGATE",
        "method": None,
        "endpoint": None,
        "payload": {},
        "requires_confirmation": False,
        "error_type": data.get("error_type"),
        "error_message": data.get("error_message"),
    }


def _build_compact_prompt(candidates: list[dict]) -> str:
    compact = [
        {"id": m["menu_id"], "name": m["menu_name"], "route": m["route"]}
        for m in candidates
    ]
    return (
        "Navigation assistant. Pick ONE menu from AllowedMenus for the user request. "
        "Output JSON only. Use exact id/name/route from the list. "
        'If unclear: {"error_type":"NEED_CLARIFICATION","error_message":"Which page?"} '
        'If no match: {"error_type":"SAFE_ERROR","error_message":"That page is not in your menu list."}\n'
        f"AllowedMenus={json.dumps(compact, separators=(',', ':'))}"
    )


def _extract_usage(usage: Any, source: str) -> dict | None:
    """Normalize an OpenAI-style usage object into a plain dict for persistence."""
    if not usage:
        return None
    prompt = getattr(usage, "prompt_tokens", None) or 0
    completion = getattr(usage, "completion_tokens", None) or 0
    total = getattr(usage, "total_tokens", None) or (prompt + completion)
    return {
        "provider": source,
        "prompt": prompt,
        "completion": completion,
        "total": total,
    }


def _log_token_usage(usage: Any, source: str) -> None:
    u = _extract_usage(usage, source)
    if not u:
        return
    logger.info(
        "[AI-NAV] %s tokens prompt=%s completion=%s total=%s",
        source,
        u["prompt"],
        u["completion"],
        u["total"],
    )


def _chat_completion_json(
    user_text: str,
    candidates: list[dict],
    *,
    api_key: str,
    base_url: str | None,
    model: str,
    source: str,
    use_json_mode: bool,
) -> tuple[dict, dict | None]:
    client_kwargs: dict[str, Any] = {"api_key": api_key}
    if base_url:
        client_kwargs["base_url"] = base_url
    client = openai.OpenAI(**client_kwargs)
    max_tokens = max(80, min(getattr(settings, "AI_NAV_MAX_OUTPUT_TOKENS", 150), 300))
    system = _build_compact_prompt(candidates)
    sanitized = _sanitize(user_text)
    create_kwargs: dict[str, Any] = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": USER_PROMPT_TEMPLATE.format(user_text=sanitized)},
        ],
        "max_tokens": max_tokens,
        "temperature": 0,
    }
    if use_json_mode:
        create_kwargs["response_format"] = {"type": "json_object"}
    resp = client.chat.completions.create(**create_kwargs)
    _log_token_usage(resp.usage, source)
    usage = _extract_usage(resp.usage, source)
    raw = (resp.choices[0].message.content or "").strip()
    return _parse_llm_json(raw), usage


def _call_nvidia(user_text: str, candidates: list[dict]) -> tuple[dict, dict | None]:
    api_key = (settings.NVIDIA_API_KEY or "").strip()
    if not api_key:
        return dict(_SAFE_ERROR_NOT_CONFIGURED), None
    base_url = (settings.NVIDIA_BASE_URL or "").strip() or "https://integrate.api.nvidia.com/v1"
    model = (settings.NVIDIA_MODEL or "meta/llama-3.1-8b-instruct").strip()
    return _chat_completion_json(
        user_text,
        candidates,
        api_key=api_key,
        base_url=base_url,
        model=model,
        source="nvidia",
        use_json_mode=False,
    )


def _call_openai(user_text: str, candidates: list[dict]) -> tuple[dict, dict | None]:
    api_key = (settings.OPENAI_API_KEY or "").strip()
    if not api_key:
        return dict(_SAFE_ERROR_NOT_CONFIGURED), None
    base_url = (settings.OPENAI_BASE_URL or "").strip() or None
    model = (settings.OPENAI_MODEL or "gpt-4o-mini").strip() or "gpt-4o-mini"
    return _chat_completion_json(
        user_text,
        candidates,
        api_key=api_key,
        base_url=base_url,
        model=model,
        source="openai",
        use_json_mode=True,
    )


def _call_llm(user_text: str, allowed_menus: list[dict]) -> tuple[dict, dict | None]:
    try:
        limit = max(4, min(getattr(settings, "AI_NAV_LLM_CANDIDATE_LIMIT", 8), 15))
        candidates = _rank_llm_candidates(user_text, allowed_menus, limit)
        nvidia_key = (settings.NVIDIA_API_KEY or "").strip()
        if nvidia_key:
            return _call_nvidia(user_text, candidates)
        return _call_openai(user_text, candidates)
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
            "error_message": _llm_failure_message(e),
        }, None


def _recover_menu(data: dict, allowed_menus: list[dict]) -> dict | None:
    route = (data.get("route") or "").strip()
    name = (data.get("menu_name") or "").strip()
    if route:
        if not route.startswith("/"):
            route = "/" + route
        match = next((m for m in allowed_menus if m["route"] == route), None)
        if match:
            return _success_from_menu(match)
    if name:
        match = next(
            (m for m in allowed_menus if m["menu_name"].lower() == name.lower()),
            None,
        )
        if match:
            return _success_from_menu(match)
    return None


def _validate_response(data: dict, allowed_menus: list[dict]) -> dict:
    if data.get("error_type"):
        return data
    if data.get("action") and data.get("action") != "NAVIGATE":
        return {
            **data,
            "menu_id": None,
            "menu_name": "",
            "parent_menu_id": None,
            "parent_menu_name": "",
            "route": "",
            "action": "NAVIGATE",
            "error_type": "SAFE_ERROR",
            "error_message": "Navigation only — try 'open [page name]'.",
        }
    allowed_ids = {m["menu_id"] for m in allowed_menus}
    menu_id = data.get("menu_id")
    if menu_id is not None and menu_id not in allowed_ids:
        recovered = _recover_menu(data, allowed_menus)
        if recovered:
            return recovered
        return {
            **data,
            "menu_id": None,
            "menu_name": "",
            "parent_menu_id": None,
            "parent_menu_name": "",
            "route": "",
            "error_type": "SAFE_ERROR",
            "error_message": "That page is not in your menu list. Type to see pages you can access.",
        }
    route = (data.get("route") or "").strip()
    if route and not route.startswith("/"):
        data["route"] = "/" + route
    data["action"] = "NAVIGATE"
    data["method"] = None
    data["endpoint"] = None
    data["requires_confirmation"] = False
    return data


def _to_interpret_response(data: dict) -> InterpretResponse:
    route = (data.get("route") or "").strip()
    if route and not route.startswith("/"):
        route = "/" + route
    return InterpretResponse(
        menu_id=data.get("menu_id"),
        menu_name=data.get("menu_name") or "",
        parent_menu_id=data.get("parent_menu_id"),
        parent_menu_name=data.get("parent_menu_name") or "",
        route=route,
        action="NAVIGATE",
        method=None,
        endpoint=None,
        payload={},
        requires_confirmation=False,
        error_type=data.get("error_type"),
        error_message=data.get("error_message"),
    )


_LOCAL_USAGE = {"provider": "local", "prompt": 0, "completion": 0, "total": 0}


def _relevant_options(
    user_text: str, allowed_menus: list[dict], limit: int = 6
) -> list[InterpretOption]:
    """Rank navigable menus most related to the phrase, for a pick-one UI.

    Used when the assistant cannot confidently navigate (clarification / no match)
    so the user can select the intended page instead of getting a dead end.
    """
    query = _normalize_query(user_text)
    q_content = _content_tokens(query)
    navigable = [m for m in allowed_menus if (m.get("route") or "").strip()]

    scored: list[tuple[float, dict]] = []
    for m in navigable:
        name = m["menu_name"].lower()
        name_content = _content_tokens(m["menu_name"])
        score = 0.0
        if query and query in name:
            score += 10.0
        score += len(q_content & name_content) * 5.0
        # Fuzzy partials help with typos (e.g. "caetgory" ~ "category" won't match,
        # but "fee" still pulls the fee pages so the user can pick).
        for qw in q_content:
            if len(qw) >= 3 and any(qw in nw or nw in qw for nw in name_content):
                score += 1.0
        if score > 0:
            scored.append((score, m))

    scored.sort(key=lambda x: (-x[0], x[1]["menu_name"]))

    options: list[InterpretOption] = []
    seen: set[str] = set()
    for _, m in scored[:limit]:
        route = (m.get("route") or "").strip()
        if not route or route in seen:
            continue
        seen.add(route)
        if not route.startswith("/"):
            route = "/" + route
        options.append(
            InterpretOption(
                menu_id=m.get("menu_id"),
                menu_name=(m.get("menu_name") or "").strip(),
                route=route,
                parent_menu_id=m.get("parent_menu_id"),
                parent_menu_name=(m.get("parent_menu_name") or "").strip(),
            )
        )
    return options


def _attach_options(
    response: InterpretResponse, user_text: str, allowed_menus: list[dict]
) -> InterpretResponse:
    """Populate selectable options whenever we did not navigate to a single page."""
    if response.error_type or not response.route:
        response.options = _relevant_options(user_text, allowed_menus)
    return response


def interpret(db: Session, user: User, user_text: str) -> tuple[InterpretResponse, dict | None]:
    """Resolve a navigation phrase.

    Returns (response, usage). `usage` is a dict with provider/prompt/completion/total
    when an LLM was called (or the zero-token 'local' marker for local matches), and
    None for early exits (empty text / no menus). The caller persists usage into
    ai_assistant_messages.tokens_* so consumption is auditable in the DB.
    """
    if not user_text or not user_text.strip():
        return InterpretResponse(
            menu_id=None,
            menu_name="",
            parent_menu_id=None,
            parent_menu_name="",
            route="",
            action="NAVIGATE",
            method=None,
            endpoint=None,
            payload={},
            requires_confirmation=False,
            error_type="NEED_CLARIFICATION",
            error_message="Please specify which page you want to open.",
        ), None

    if user.tenant_id is not None:
        ensure_ai_tenant_plan_synced(db, int(user.tenant_id))

    if not user_has_ai_assistant_access(db, user):
        return InterpretResponse(
            menu_id=None,
            menu_name="",
            parent_menu_id=None,
            parent_menu_name="",
            route="",
            action="NAVIGATE",
            method=None,
            endpoint=None,
            payload={},
            requires_confirmation=False,
            error_type="SAFE_ERROR",
            error_message="AI Assistant is not enabled for your school. Contact your administrator.",
        ), None

    allowed_menus = _build_allowed_menus(db, user)
    if not allowed_menus:
        return InterpretResponse(
            menu_id=None,
            menu_name="",
            parent_menu_id=None,
            parent_menu_name="",
            route="",
            action="NAVIGATE",
            method=None,
            endpoint=None,
            payload={},
            requires_confirmation=False,
            error_type="SAFE_ERROR",
            error_message="No pages are assigned to your role yet. Ask your system admin.",
        ), None

    plan = get_ai_tenant_plan(db, user.tenant_id)

    local = _local_match(user_text, allowed_menus)
    if local:
        logger.info("[AI-NAV] local match menu_id=%s (0 tokens)", local.get("menu_id"))
        data = _validate_response(local, allowed_menus)
        return _to_interpret_response(data), dict(_LOCAL_USAGE)

    llm_allowed = resolve_effective_llm_enabled(db, user, plan)
    if not llm_allowed:
        logger.info(
            "[AI-NAV] basic plan tenant_id=%s user_id=%s — LLM blocked (0 tokens)",
            user.tenant_id,
            user.id,
        )
        if plan.llm_enabled and not user_has_llm_permission(db, user):
            basic_msg = (
                "Smart AI is not enabled for your role. Pick a page below "
                "or type the exact screen name."
            )
        else:
            basic_msg = (
                "Pick a page below, or type the exact screen name "
                "(Basic plan — smart AI is not included)."
            )
        response = InterpretResponse(
            menu_id=None,
            menu_name="",
            parent_menu_id=None,
            parent_menu_name="",
            route="",
            action="NAVIGATE",
            method=None,
            endpoint=None,
            payload={},
            requires_confirmation=False,
            error_type="NEED_CLARIFICATION",
            error_message=basic_msg,
        )
        return _attach_options(response, user_text, allowed_menus), dict(_LOCAL_USAGE)

    data, usage = _call_llm(user_text, allowed_menus)
    data = _validate_response(data, allowed_menus)
    response = _attach_options(_to_interpret_response(data), user_text, allowed_menus)
    return response, usage
