"""Service layer for Tenant CRUD and queries."""
from datetime import datetime
import re

from sqlalchemy.orm import Session
from sqlalchemy import insert

from app.core.exceptions import NotFoundException, ConflictException, AppException
from app.core.logging_config import get_logger
from app.models.tenant import Tenant
from app.models.user import User, UserRole
from app.models.role import Role, user_roles, role_menus
from app.models.menu import Menu
from app.schemas.tenant import TenantCreate, TenantUpdate, TenantProvision
from app.utils.security import hash_password

logger = get_logger(__name__)

def get_tenants(
    db: Session,
    search: str | None = None,
    page: int = 1,
    page_size: int = 100,
) -> tuple[list[Tenant], int]:
    """Get non-deleted tenants with optional search and pagination."""
    query = db.query(Tenant).filter(Tenant.is_deleted == False)  # noqa: E712
    if search:
        query = query.filter(Tenant.name.ilike(f"%{search}%"))
    
    total_count = query.count()
    
    tenants = (
        query.order_by(Tenant.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return tenants, total_count

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

def provision_tenant(db: Session, data: TenantProvision, created_by: int | None = None) -> dict:
    """
    Enterprise-grade tenant provisioning workflow.
    Executes 6 steps inside ONE SQL TRANSACTION with rollback on failure.
    """
    base_code = re.sub(r'[^a-zA-Z0-9]', '_', data.name).strip('_').upper()[:50]
    if not base_code:
        base_code = "TENANT"
    
    code = base_code
    counter = 1
    while db.query(Tenant).filter(Tenant.code == code).first():
        suffix = f"_{counter}"
        code = base_code[:50-len(suffix)] + suffix
        counter += 1

    if db.query(User).filter(User.email == data.email.lower(), User.is_deleted == False).first():
        raise ConflictException(f"User with email '{data.email}' already exists")

    try:
        new_tenant = Tenant(
            code=code,
            name=data.name,
            owner_name=data.owner_name,
            email=data.email,
            phone=data.phone,
            description=data.description,
            is_active=data.is_active,
            logo_url=data.logo_url,
            theme_template_id=data.theme_template_id,
            address_line1=data.address_line1,
            address_line2=data.address_line2,
            city=data.city,
            state=data.state,
            pin_code=data.pin_code,
            created_by=created_by,
        )
        db.add(new_tenant)
        db.flush()

        admin_role = Role(
            tenant_id=new_tenant.id,
            code="ADMIN",
            name="Admin",
            scope_type="Tenant",
            is_system=False,
            is_active=True,
            created_by=created_by,
        )
        db.add(admin_role)
        db.flush()

        active_menus = db.query(Menu).filter(Menu.is_active == True, Menu.is_deleted == False).all()
        if active_menus:
            menu_ids = [m.id for m in active_menus]
            mappings = [{"role_id": admin_role.id, "menu_id": mid} for mid in menu_ids]
            db.execute(insert(role_menus), mappings)

        admin_user = User(
            email=data.email.lower(),
            full_name=data.owner_name or "Admin User",
            hashed_password=hash_password(data.admin_password),
            role=UserRole.ADMIN,
            tenant_id=new_tenant.id,
            is_active=data.is_active,
            created_by=created_by,
        )
        db.add(admin_user)
        db.flush()

        db.execute(
            insert(user_roles),
            {"user_id": admin_user.id, "role_id": admin_role.id}
        )

        db.commit()
        logger.info(f"Tenant {code} provisioned successfully with ADMIN {data.email}")

        return {
            "tenant_id": new_tenant.id,
            "admin_user_id": admin_user.id,
            "admin_role_id": admin_role.id,
            "message": "Tenant provisioned with default ADMIN user and role."
        }

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to provision tenant: {str(e)}")
        if isinstance(e, AppException):
            raise e
        raise AppException(f"Unable to provision tenant: {str(e)}", status_code=500)

def update_tenant(db: Session, tenant_id: int, data: TenantUpdate, updated_by: int | None = None) -> Tenant:
    """Update an existing tenant and sync user status if changed."""
    tenant = get_tenant(db, tenant_id)
    
    status_changed = False
    new_status = None

    if data.name is not None:
        tenant.name = data.name
    if data.owner_name is not None:
        tenant.owner_name = data.owner_name
    if data.phone is not None:
        tenant.phone = data.phone
    if data.description is not None:
        tenant.description = data.description
    
    sent = data.model_dump(exclude_unset=True)
    if "logo_url" in sent:
        tenant.logo_url = sent["logo_url"]
    if "theme_template_id" in sent:
        tenant.theme_template_id = sent["theme_template_id"]
        
    if data.address_line1 is not None:
        tenant.address_line1 = data.address_line1
    if data.address_line2 is not None:
        tenant.address_line2 = data.address_line2
    if data.city is not None:
        tenant.city = data.city
    if data.state is not None:
        tenant.state = data.state
    if data.pin_code is not None:
        tenant.pin_code = data.pin_code
    if data.is_active is not None:
        if tenant.is_active != data.is_active:
            status_changed = True
            new_status = data.is_active
        tenant.is_active = data.is_active

    tenant.updated_by = updated_by
    tenant.updated_at = datetime.utcnow()
    
    if status_changed:
        db.query(User).filter(User.tenant_id == tenant_id).update({
            "is_active": new_status,
            "updated_at": datetime.utcnow(),
            "updated_by": updated_by,
        })
        logger.info(f"Tenant {tenant.code} status changed to {new_status}. All users synchronized.")

    db.commit()
    db.refresh(tenant)
    logger.info(f"Tenant updated: {tenant.code} (id={tenant.id})")
    return tenant

def soft_delete_tenant(db: Session, tenant_id: int, deleted_by: int | None = None) -> None:
    """Soft delete a tenant and deactivate all its users."""
    tenant = get_tenant(db, tenant_id)
    tenant.is_deleted = True
    tenant.deleted_at = datetime.utcnow()
    tenant.deleted_by = deleted_by
    
    db.query(User).filter(User.tenant_id == tenant_id).update({"is_active": False})
    
    db.commit()
    logger.info(f"Tenant soft-deleted: {tenant.code} (id={tenant.id}) and all users deactivated.")

def _update_tenant_status(db: Session, tenant_id: int, is_active: bool, updated_by: int | None = None) -> Tenant:
    """Internal helper to update tenant status and sync all users."""
    tenant = get_tenant(db, tenant_id)
    tenant.is_active = is_active
    tenant.updated_by = updated_by
    tenant.updated_at = datetime.utcnow()
    
    db.query(User).filter(User.tenant_id == tenant_id).update({
        "is_active": is_active,
        "updated_at": datetime.utcnow(),
        "updated_by": updated_by,
    })
    
    db.commit()
    db.refresh(tenant)
    status_str = "activated" if is_active else "deactivated"
    logger.info(f"Tenant {status_str}: {tenant.code} (id={tenant.id}) and all users synced.")
    return tenant

def activate_tenant(db: Session, tenant_id: int, updated_by: int | None = None) -> Tenant:
    """Activate a tenant and all its users."""
    return _update_tenant_status(db, tenant_id, True, updated_by)

def deactivate_tenant(db: Session, tenant_id: int, updated_by: int | None = None) -> Tenant:
    """Deactivate a tenant and all its users."""
    return _update_tenant_status(db, tenant_id, False, updated_by)
