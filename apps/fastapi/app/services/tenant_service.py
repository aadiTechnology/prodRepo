"""Service layer for Tenant CRUD and queries."""

from datetime import datetime

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException, ConflictException
from app.core.logging_config import get_logger
from app.models.tenant import Tenant
from app.schemas.tenant import TenantCreate, TenantUpdate


logger = get_logger(__name__)


def get_tenants(db: Session) -> list[Tenant]:
    """Get all non-deleted tenants."""
    return db.query(Tenant).filter(Tenant.is_deleted == False).all()  # noqa: E712


def get_tenant(db: Session, tenant_id: int) -> Tenant:
    """Get a single tenant by ID."""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id, Tenant.is_deleted == False).first()  # noqa: E712
    if not tenant:
        raise NotFoundException("Tenant", tenant_id)
    return tenant


def get_tenant_by_code(db: Session, code: str) -> Tenant | None:
    """Get a tenant by code."""
    return (
        db.query(Tenant)
        .filter(Tenant.code == code, Tenant.is_deleted == False)  # noqa: E712
        .first()
    )


def create_tenant(db: Session, data: TenantCreate, created_by: int | None = None) -> Tenant:
    """Create a new tenant."""
    # Ensure code uniqueness
    existing = get_tenant_by_code(db, data.code)
    if existing:
        raise ConflictException(f"Tenant with code '{data.code}' already exists")

    tenant = Tenant(
        code=data.code,
        name=data.name,
        description=data.description,
        is_active=data.is_active,
        created_by=created_by,
    )
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    logger.info(f"Tenant created: {tenant.code} (id={tenant.id})")
    return tenant


def update_tenant(db: Session, tenant_id: int, data: TenantUpdate, updated_by: int | None = None) -> Tenant:
    """Update an existing tenant."""
    tenant = get_tenant(db, tenant_id)

    if data.name is not None:
        tenant.name = data.name
    if data.description is not None:
        tenant.description = data.description
    if data.is_active is not None:
        tenant.is_active = data.is_active

    tenant.updated_by = updated_by
    tenant.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(tenant)
    logger.info(f"Tenant updated: {tenant.code} (id={tenant.id})")
    return tenant


def soft_delete_tenant(db: Session, tenant_id: int, deleted_by: int | None = None) -> None:
    """Soft delete a tenant."""
    tenant = get_tenant(db, tenant_id)
    tenant.is_deleted = True
    tenant.deleted_at = datetime.utcnow()
    tenant.deleted_by = deleted_by
    db.commit()
    logger.info(f"Tenant soft-deleted: {tenant.code} (id={tenant.id})")
