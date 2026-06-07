"""Service layer for Tenant CRUD and queries."""
from datetime import datetime
import re

from sqlalchemy.orm import Session
from sqlalchemy import insert

from app.core.exceptions import NotFoundException, ConflictException, AppException
from app.core.logging_config import get_logger
from app.models.tenant import Tenant
from app.models.user import User, UserRole
from app.models.role import Role, user_roles
from app.schemas.tenant import TenantCreate, TenantUpdate, TenantProvision, TenantSchoolPickerItem
from app.services import theme_template_service
from app.utils.security import hash_password

logger = get_logger(__name__)


def normalize_login_host(raw: str) -> str:
    """Normalize browser host or login URL for lookup (lowercase, host only)."""
    host = (raw or "").strip().lower()
    if not host:
        return ""
    if "://" in host:
        host = host.split("://", 1)[1]
    if "/" in host:
        host = host.split("/", 1)[0]
    if ":" in host and not host.startswith("["):
        host = host.split(":", 1)[0]
    return host.rstrip(".")


def _normalize_tenant_login_url(raw: str | None) -> str | None:
    """Persistable login URL (hostname) for tenants.login_url."""
    if raw is None:
        return None
    normalized = normalize_login_host(raw)
    return normalized or None


def _assert_login_url_available(db: Session, login_url: str | None, exclude_tenant_id: int | None = None) -> None:
    if not login_url:
        return
    query = db.query(Tenant).filter(
        Tenant.login_url == login_url,
        Tenant.is_deleted == False,  # noqa: E712
    )
    if exclude_tenant_id is not None:
        query = query.filter(Tenant.id != exclude_tenant_id)
    if query.first():
        raise ConflictException(f"Login URL '{login_url}' is already assigned to another school.")


def _to_school_picker_item(db: Session, tenant: Tenant) -> TenantSchoolPickerItem:
    tid = getattr(tenant, "theme_template_id", None)
    theme_config = theme_template_service.get_template_config(db, tid) if tid else None
    return TenantSchoolPickerItem(
        id=tenant.id,
        name=tenant.name,
        code=tenant.code,
        logo_url=tenant.logo_url,
        theme_template_id=tid,
        theme_config=theme_config,
    )


def list_public_schools_for_login(
    db: Session,
    page: int = 1,
    page_size: int = 100,
) -> tuple[list[TenantSchoolPickerItem], int]:
    """Active, non-deleted tenants for the public school picker (pre-login)."""
    query = db.query(Tenant).filter(
        Tenant.is_deleted == False,  # noqa: E712
        Tenant.is_active == True,  # noqa: E712
    )
    total_count = query.count()
    rows = (
        query.order_by(Tenant.name.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return [_to_school_picker_item(db, t) for t in rows], total_count


def get_public_school_for_login(db: Session, tenant_id: int) -> TenantSchoolPickerItem:
    """Single active tenant for login branding refresh (public)."""
    tenant = (
        db.query(Tenant)
        .filter(
            Tenant.id == tenant_id,
            Tenant.is_deleted == False,  # noqa: E712
            Tenant.is_active == True,  # noqa: E712
        )
        .first()
    )
    if not tenant:
        raise NotFoundException("Tenant", tenant_id)
    return _to_school_picker_item(db, tenant)


def resolve_public_school_by_host(db: Session, host: str) -> TenantSchoolPickerItem:
    """Resolve active tenant from login host (public, pre-login)."""
    normalized = normalize_login_host(host)
    if not normalized:
        raise NotFoundException("Tenant", host)

    tenant = (
        db.query(Tenant)
        .filter(
            Tenant.login_url == normalized,
            Tenant.is_deleted == False,  # noqa: E712
            Tenant.is_active == True,  # noqa: E712
        )
        .first()
    )
    if not tenant:
        raise NotFoundException("Tenant", normalized)
    return _to_school_picker_item(db, tenant)


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

    login_url = _normalize_tenant_login_url(getattr(data, "login_url", None))
    _assert_login_url_available(db, login_url)

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
            login_url=login_url,
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

        # 5. Provision TEACHER role
        teacher_role = Role(
            tenant_id=new_tenant.id,
            code="TEACHER",
            name="Teacher",
            scope_type="Tenant",
            is_system=False,
            is_active=True,
            created_by=created_by,
        )
        db.add(teacher_role)
        db.flush()
        logger.info(f"Tenant {code}: Provisioned default TEACHER role")

        db.commit()
        logger.info(f"Tenant {code} provisioned successfully with ADMIN {data.email}")

        return {
            "tenant_id": new_tenant.id,
            "admin_user_id": admin_user.id,
            "admin_role_id": admin_role.id,
            "message": "Tenant provisioned with default ADMIN user and role. Assign menu permissions via Permission Management."
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
    if "login_url" in sent:
        login_url = _normalize_tenant_login_url(sent["login_url"])
        _assert_login_url_available(db, login_url, exclude_tenant_id=tenant_id)
        tenant.login_url = login_url

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
