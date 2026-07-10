"""Sync AI Assistant basic vs LLM tier with Permission Management grants."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import or_, text
from sqlalchemy.orm import Session

from app.core.logging_config import get_logger
from app.models.ai_assistant_tenant_config import AiAssistantTenantConfig
from app.models.menu import Menu
from app.models.role import Role
from app.models.role_menu_permission import RoleMenuPermission
from app.models.user import User
from app.services.ai_tenant_config_service import AiTenantPlan, get_ai_tenant_plan
from app.services.rbac_service import get_user_roles

logger = get_logger(__name__)

AI_ADVANCED_PATH = "/ai/advanced"
AI_BASIC_PATH = "/ai/basic"


def _ai_advanced_menu_filter():
    return or_(
        Menu.path == AI_ADVANCED_PATH,
        Menu.name.ilike("%AI Advanced%"),
    )


def _ai_basic_menu_filter():
    return or_(
        Menu.path == AI_BASIC_PATH,
        Menu.name.ilike("%Campus Buddy%"),
    )


def _ai_module_menu_filter():
    return Menu.name.ilike("%AI Assistant%")


def _ai_access_menu_filter():
    return or_(
        _ai_module_menu_filter(),
        _ai_basic_menu_filter(),
        _ai_advanced_menu_filter(),
    )


def _advanced_menu_ids(db: Session) -> list[int]:
    rows = (
        db.query(Menu.id)
        .filter(Menu.is_deleted == False, _ai_advanced_menu_filter())  # noqa: E712
        .all()
    )
    return [int(r[0]) for r in rows]


def tenant_grants_ai_advanced(db: Session, tenant_id: int) -> bool:
    """True when any tenant role has can_view on the AI Advanced (LLM) menu."""
    menu_ids = _advanced_menu_ids(db)
    if not menu_ids:
        return False
    row = (
        db.query(RoleMenuPermission.id)
        .join(Role, Role.id == RoleMenuPermission.role_id)
        .filter(
            Role.tenant_id == tenant_id,
            Role.is_deleted == False,  # noqa: E712
            RoleMenuPermission.menu_id.in_(menu_ids),
            RoleMenuPermission.can_view == True,  # noqa: E712
            or_(
                RoleMenuPermission.tenant_id == tenant_id,
                RoleMenuPermission.tenant_id.is_(None),
            ),
        )
        .first()
    )
    return row is not None


def tenant_grants_ai_basic(db: Session, tenant_id: int) -> bool:
    """True when any tenant role has can_view on Campus Buddy (Basic) or AI Assistant module."""
    row = (
        db.query(RoleMenuPermission.id)
        .join(Role, Role.id == RoleMenuPermission.role_id)
        .join(Menu, Menu.id == RoleMenuPermission.menu_id)
        .filter(
            Role.tenant_id == tenant_id,
            Role.is_deleted == False,  # noqa: E712
            Menu.is_deleted == False,  # noqa: E712
            RoleMenuPermission.can_view == True,  # noqa: E712
            or_(_ai_basic_menu_filter(), _ai_module_menu_filter()),
            or_(
                RoleMenuPermission.tenant_id == tenant_id,
                RoleMenuPermission.tenant_id.is_(None),
            ),
        )
        .first()
    )
    return row is not None


def user_has_ai_assistant_access(db: Session, user: User) -> bool:
    """True when the user's effective RBAC includes Campus Buddy or AI Advanced."""
    if user.tenant_id is None:
        return False
    from app.services.rbac_service import resolve_user_permissions_and_menus

    _, menu_tree = resolve_user_permissions_and_menus(db, user)

    def _walk(nodes: list) -> bool:
        for node in nodes:
            path = (getattr(node, "path", None) or "").strip()
            name = (getattr(node, "name", None) or "").lower()
            level = getattr(node, "level", None)
            if path in (AI_BASIC_PATH, AI_ADVANCED_PATH):
                return True
            if level == 1 and "ai assistant" in name:
                return True
            children = getattr(node, "children", None) or []
            if children and _walk(children):
                return True
        return False

    return _walk(menu_tree)


def user_has_llm_permission(db: Session, user: User) -> bool:
    """True when the user's role(s) include can_view on AI Advanced (LLM)."""
    if user.tenant_id is None:
        return False
    menu_ids = _advanced_menu_ids(db)
    if not menu_ids:
        return False
    roles = get_user_roles(db, int(user.id))
    role_ids = [int(r.id) for r in roles]
    if not role_ids:
        return False
    row = (
        db.query(RoleMenuPermission.id)
        .filter(
            RoleMenuPermission.role_id.in_(role_ids),
            RoleMenuPermission.menu_id.in_(menu_ids),
            RoleMenuPermission.can_view == True,  # noqa: E712
        )
        .first()
    )
    return row is not None


def resolve_effective_llm_enabled(db: Session, user: User, plan: AiTenantPlan | None = None) -> bool:
    """
    LLM runs when the user's role has AI Advanced (LLM) in Permission Management.

    Permission Mapping is the source of truth for basic vs LLM. The
    ai_assistant_tenant_config row is kept in sync on save but must not block LLM
    when grants exist and the config row is missing or stale.
    """
    if user.tenant_id is None:
        return False
    if not user_has_llm_permission(db, user):
        return False
    if plan is None:
        plan = get_ai_tenant_plan(db, user.tenant_id)
    if not plan.ai_enabled:
        return tenant_grants_ai_advanced(db, int(user.tenant_id))
    return True


def _set_tenant_module_active(db: Session, tenant_id: int, module_name: str, is_active: bool) -> None:
    active_val = 1 if is_active else 0
    updated = db.execute(
        text(
            "UPDATE dbo.tenant_module_assignments "
            "SET is_active = :active "
            "WHERE tenant_id = :tid AND module_name = :mod"
        ),
        {"tid": tenant_id, "mod": module_name, "active": active_val},
    )
    if updated.rowcount == 0:
        db.execute(
            text(
                "INSERT INTO dbo.tenant_module_assignments "
                "(tenant_id, module_name, is_active, created_at) "
                "VALUES (:tid, :mod, :active, GETUTCDATE())"
            ),
            {"tid": tenant_id, "mod": module_name, "active": active_val},
        )


def ensure_ai_tenant_plan_synced(db: Session, tenant_id: int) -> None:
    """Keep tenant AI config aligned with Permission Mapping (idempotent)."""
    has_advanced = tenant_grants_ai_advanced(db, tenant_id)
    has_basic = tenant_grants_ai_basic(db, tenant_id)
    expected_ai_enabled = has_advanced or has_basic
    expected_tier = "advanced" if has_advanced else "basic"

    row = (
        db.query(AiAssistantTenantConfig)
        .filter(AiAssistantTenantConfig.tenant_id == tenant_id)
        .first()
    )
    needs_sync = row is None and expected_ai_enabled
    if row is not None:
        needs_sync = (
            bool(row.llm_enabled) != has_advanced
            or bool(row.ai_enabled) != expected_ai_enabled
            or (row.plan_tier or "basic").lower() != expected_tier
        )
    if needs_sync:
        sync_ai_tenant_plan_from_permissions(db, tenant_id)


def sync_ai_tenant_plan_from_permissions(db: Session, tenant_id: int) -> None:
    """
    Align ai_assistant_tenant_config + tenant_module_assignments with Permission
    Management grants for this tenant.
    """
    has_advanced = tenant_grants_ai_advanced(db, tenant_id)
    has_basic = tenant_grants_ai_basic(db, tenant_id)
    ai_enabled = has_advanced or has_basic

    row = (
        db.query(AiAssistantTenantConfig)
        .filter(AiAssistantTenantConfig.tenant_id == tenant_id)
        .first()
    )
    if not row:
        row = AiAssistantTenantConfig(
            tenant_id=tenant_id,
            ai_enabled=ai_enabled,
            plan_tier="advanced" if has_advanced else "basic",
            llm_enabled=has_advanced,
        )
        db.add(row)
    else:
        row.ai_enabled = ai_enabled
        row.plan_tier = "advanced" if has_advanced else "basic"
        row.llm_enabled = has_advanced
        row.updated_at = datetime.utcnow()

    _set_tenant_module_active(db, tenant_id, "AI_ASSISTANT", has_basic or has_advanced)
    _set_tenant_module_active(db, tenant_id, "AI_ASSISTANT_ADVANCED", has_advanced)

    db.commit()
    logger.info(
        "[AI-SYNC] tenant_id=%s ai_enabled=%s plan=%s llm=%s (basic=%s advanced=%s)",
        tenant_id,
        ai_enabled,
        row.plan_tier,
        has_advanced,
        has_basic,
        has_advanced,
    )


def get_effective_ai_plan_for_user(db: Session, user: User) -> AiTenantPlan:
    """Plan info returned to clients — reflects Permission Mapping per user."""
    if user.tenant_id is None:
        return get_ai_tenant_plan(db, None)
    plan = get_ai_tenant_plan(db, user.tenant_id)
    ai_enabled = user_has_ai_assistant_access(db, user)
    llm = resolve_effective_llm_enabled(db, user, plan) if ai_enabled else False
    tier = "advanced" if llm else "basic"
    return AiTenantPlan(
        tenant_id=plan.tenant_id,
        ai_enabled=ai_enabled,
        plan_tier=tier,
        llm_enabled=llm,
        monthly_llm_unit_cap=plan.monthly_llm_unit_cap,
        daily_llm_unit_cap_per_user=plan.daily_llm_unit_cap_per_user,
        monthly_fee_inr=plan.monthly_fee_inr,
    )
