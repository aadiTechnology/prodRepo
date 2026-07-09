"""Read per-tenant AI Assistant plan (basic vs advanced)."""
from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.models.ai_assistant_tenant_config import AiAssistantTenantConfig


@dataclass(frozen=True)
class AiTenantPlan:
    tenant_id: int
    ai_enabled: bool
    plan_tier: str
    llm_enabled: bool
    monthly_llm_unit_cap: int | None = None
    daily_llm_unit_cap_per_user: int | None = None
    monthly_fee_inr: float | None = None


_DEFAULT_BASIC = AiTenantPlan(
    tenant_id=0,
    ai_enabled=True,
    plan_tier="basic",
    llm_enabled=False,
)


def get_ai_tenant_plan(db: Session, tenant_id: int | None) -> AiTenantPlan:
    """Return plan for tenant. Missing row => basic (no LLM). Platform users => basic."""
    if tenant_id is None:
        return _DEFAULT_BASIC

    row = (
        db.query(AiAssistantTenantConfig)
        .filter(AiAssistantTenantConfig.tenant_id == tenant_id)
        .first()
    )
    if not row:
        return AiTenantPlan(
            tenant_id=int(tenant_id),
            ai_enabled=True,
            plan_tier="basic",
            llm_enabled=False,
        )

    fee = float(row.monthly_fee_inr) if row.monthly_fee_inr is not None else None
    return AiTenantPlan(
        tenant_id=int(row.tenant_id),
        ai_enabled=bool(row.ai_enabled),
        plan_tier=(row.plan_tier or "basic").lower(),
        llm_enabled=bool(row.llm_enabled),
        monthly_llm_unit_cap=row.monthly_llm_unit_cap,
        daily_llm_unit_cap_per_user=row.daily_llm_unit_cap_per_user,
        monthly_fee_inr=fee,
    )
