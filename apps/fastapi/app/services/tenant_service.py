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
    # 1. Generate unique tenant code from name
    base_code = re.sub(r'[^a-zA-Z0-9]', '_', data.name).upper()[:50]
    code = base_code
    counter = 1
    while db.query(Tenant).filter(Tenant.code == code).first():
        suffix = f"_{counter}"
        code = base_code[:50-len(suffix)] + suffix
        counter += 1

    # Check for duplicate user email
    if db.query(User).filter(User.email == data.email.lower(), User.is_deleted == False).first():
        raise ConflictException(f"User with email '{data.email}' already exists")

    try:
        # STEP 1: Insert tenant into tenants table
        new_tenant = Tenant(
            code=code,
            name=data.name,
            owner_name=data.owner_name,
            email=data.email,
            phone=data.phone,
            description=data.description,
            is_active=data.is_active,
            created_by=created_by,
        )
        db.add(new_tenant)
        db.flush()  # Step 2: Retrieve newly created tenant_id.

        # STEP 3: Create default ADMIN role
        admin_role = Role(
            tenant_id=new_tenant.id,
            code="ADMIN",  # Uppercase enforced
            name="Admin",
            scope_type="Tenant",
            is_system=False,
            is_active=True,
            created_by=created_by,
        )
        db.add(admin_role)
        db.flush()  # Get admin_role.id

        # STEP 4: Assign all active menus to ADMIN role
        active_menus = db.query(Menu).filter(Menu.is_active == True, Menu.is_deleted == False).all()
        if active_menus:
            menu_ids = [m.id for m in active_menus]
            mappings = [{"role_id": admin_role.id, "menu_id": mid} for mid in menu_ids]
            db.execute(insert(role_menus), mappings)

        # STEP 5: Create default Admin user
        admin_user = User(
            email=data.email.lower(),
            full_name=data.owner_name or "Admin User",
            hashed_password=hash_password(data.admin_password),
            role=UserRole.ADMIN,
            tenant_id=new_tenant.id,
            is_active=data.is_active, # Sync user status with tenant initial status
            created_by=created_by,
        )
        db.add(admin_user)
        db.flush()

        # STEP 6: Map user to role
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
    if data.is_active is not None:
        if tenant.is_active != data.is_active:
            status_changed = True
            new_status = data.is_active
        tenant.is_active = data.is_active

    tenant.updated_by = updated_by
    tenant.updated_at = datetime.utcnow()
    
    # Sync all users in this tenant if status changed
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
    
    # Also deactivate all users in this tenant
    db.query(User).filter(User.tenant_id == tenant_id).update({"is_active": False})
    
    db.commit()
    logger.info(f"Tenant soft-deleted: {tenant.code} (id={tenant.id}) and all users deactivated.")


def activate_tenant(db: Session, tenant_id: int, updated_by: int | None = None) -> Tenant:
    """Activate a tenant and all its users."""
    tenant = get_tenant(db, tenant_id)
    tenant.is_active = True
    tenant.updated_by = updated_by
    tenant.updated_at = datetime.utcnow()
    
    # Also activate all users in this tenant
    db.query(User).filter(User.tenant_id == tenant_id).update({
        "is_active": True,
        "updated_at": datetime.utcnow(),
        "updated_by": updated_by,
    })
    
    db.commit()
    db.refresh(tenant)
    logger.info(f"Tenant activated: {tenant.code} (id={tenant.id}) and all users reactivated.")
    return tenant


def deactivate_tenant(db: Session, tenant_id: int, updated_by: int | None = None) -> Tenant:
    """Deactivate a tenant and all its users."""
    tenant = get_tenant(db, tenant_id)
    tenant.is_active = False
    tenant.updated_by = updated_by
    tenant.updated_at = datetime.utcnow()
    
    # Also deactivate all users in this tenant
    db.query(User).filter(User.tenant_id == tenant_id).update({
        "is_active": False,
        "updated_at": datetime.utcnow(),
        "updated_by": updated_by,
    })
    
    db.commit()
    db.refresh(tenant)
    logger.info(f"Tenant deactivated: {tenant.code} (id={tenant.id}) and all users deactivated.")
    return tenant
