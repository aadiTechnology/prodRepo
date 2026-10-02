"""Persistence for tenant_fee_due_display_config (Due Fee list visibility window)."""

from datetime import datetime
from typing import Optional

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.fee import TenantFeeDueDisplayConfig

DEFAULT_DISPLAY_ENABLED = False
DEFAULT_DAYS_BEFORE_DUE = 7


def get_config(db: Session, *, tenant_id: int) -> Optional[TenantFeeDueDisplayConfig]:
    return (
        db.query(TenantFeeDueDisplayConfig)
        .filter(TenantFeeDueDisplayConfig.tenant_id == tenant_id)
        .first()
    )


def get_or_create_config(
    db: Session,
    *,
    tenant_id: int,
    created_by: Optional[int] = None,
) -> TenantFeeDueDisplayConfig:
    existing = get_config(db, tenant_id=tenant_id)
    if existing:
        return existing
    row = TenantFeeDueDisplayConfig(
        tenant_id=tenant_id,
        display_enabled=DEFAULT_DISPLAY_ENABLED,
        days_before_due=DEFAULT_DAYS_BEFORE_DUE,
        created_at=datetime.utcnow(),
        created_by=created_by,
    )
    db.add(row)
    try:
        db.commit()
        db.refresh(row)
        return row
    except IntegrityError:
        db.rollback()
        existing = get_config(db, tenant_id=tenant_id)
        if existing:
            return existing
        raise


def update_config(
    db: Session,
    *,
    row: TenantFeeDueDisplayConfig,
    display_enabled: Optional[bool] = None,
    days_before_due: Optional[int] = None,
    updated_by: Optional[int] = None,
) -> TenantFeeDueDisplayConfig:
    if display_enabled is not None:
        row.display_enabled = display_enabled
    if days_before_due is not None:
        row.days_before_due = int(days_before_due)
    row.updated_at = datetime.utcnow()
    row.updated_by = updated_by
    db.commit()
    db.refresh(row)
    return row
