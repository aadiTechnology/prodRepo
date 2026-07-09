from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String

from app.core.database import Base


class AiAssistantTenantConfig(Base):
    """Per-tenant AI Assistant plan: basic (no LLM) vs advanced (LLM + caps)."""

    __tablename__ = "ai_assistant_tenant_config"

    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), primary_key=True)
    ai_enabled = Column(Boolean, nullable=False, default=True)
    plan_tier = Column(String(20), nullable=False, default="basic")
    llm_enabled = Column(Boolean, nullable=False, default=False)
    monthly_llm_unit_cap = Column(Integer, nullable=True)
    daily_llm_unit_cap_per_user = Column(Integer, nullable=True)
    monthly_fee_inr = Column(Numeric(10, 2), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True)
