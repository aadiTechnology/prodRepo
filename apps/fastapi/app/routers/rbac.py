"""RBAC assignment endpoints (user roles, role menus, role features)."""

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Dict

from app.core.database import get_db
from app.core.dependencies import require_permission, CurrentUser, get_rbac_role_codes, SYSTEM_ADMIN_ROLE_CODE
from app.core.exceptions import ForbiddenException
from app.models.menu import Menu
from app.schemas.role import RoleResponse
from app.schemas.menu import MenuResponse
from app.schemas.feature import FeatureResponse
from app.services import rbac_service, role_service, menu_service, feature_service, user_service
from app.models.permission import Permission

from app.schemas.permission import PermissionResponse
from app.schemas.rbac_mgmt import RolePermissionMatrixResponse, PermissionMatrixRow, PermissionBulkUpdateRequest
from app.models.role_menu_permission import RoleMenuPermission

router = APIRouter(prefix="/rbac", tags=["RBAC"])


def _is_system_admin(current_user: CurrentUser, db: Session) -> bool:
    if current_user.tenant_id is not None:
        return False
    user_role = str(current_user.role)
    if user_role in ["SUPER_ADMIN", "admin", "ADMIN"]:
        return True
    rbac_role_codes = get_rbac_role_codes(db, current_user.id)
    return SYSTEM_ADMIN_ROLE_CODE.lower() in rbac_role_codes


def _assert_role_scope_access(role, current_user: CurrentUser, db: Session) -> None:
    if _is_system_admin(current_user, db):
        return
    if current_user.tenant_id is None or role.tenant_id != current_user.tenant_id:
        raise ForbiddenException("Insufficient permissions")

@router.get("/roles/{role_id}/matrix", response_model=RolePermissionMatrixResponse)
def get_role_permission_matrix(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Roles", "view"))
):
    """Fetch the full menu/permission grid for a role."""
    role = role_service.get_role(db, role_id)
    _assert_role_scope_access(role, current_user, db)
    
    # 1. Get all menus in scope of the role being edited.
    # Do not hide menus based on current user's menu visibility in matrix view;
    # update endpoint already enforces grant constraints for non-super-admin users.

    # Scope menus strictly to the role being edited:
    # - Platform role (role.tenant_id is None): only global menus (Menu.tenant_id IS NULL).
    # - Tenant role: global menus + that tenant's own menus.
    query = db.query(Menu).filter(
        Menu.is_active == True,  # noqa: E712
        Menu.is_deleted == False,  # noqa: E712
    )
    if role.tenant_id is None:
        query = query.filter(Menu.tenant_id.is_(None))
    else:
        query = query.filter(
            (Menu.tenant_id.is_(None)) | (Menu.tenant_id == role.tenant_id)
        )
    
    all_menus = query.all()
    
    # 2. Get current permissions for this role
    current_perms = db.query(RoleMenuPermission).filter(
        RoleMenuPermission.role_id == role_id
    ).all()
    
    perm_map = {p.menu_id: p for p in current_perms}
    
    # 3. Build response rows (ordered hierarchically)
    items = []
    parent_menus = sorted([m for m in all_menus if m.level == 1], key=lambda x: (x.sort_order, x.id))
    child_menus = [m for m in all_menus if m.level == 2]
    
    for pm in parent_menus:
        # Add parent
        p = perm_map.get(pm.id)
        items.append(PermissionMatrixRow(
            menu_id=pm.id,
            menu_name=pm.name,
            parent_id=pm.parent_id,
            level=pm.level,
            can_view=p.can_view if p else False,
            can_create=p.can_create if p else False,
            can_edit=p.can_edit if p else False,
            can_delete=p.can_delete if p else False
        ))
        
        # Add children for this parent
        my_children = sorted([cm for cm in child_menus if cm.parent_id == pm.id], key=lambda x: (x.sort_order, x.id))
        for cm in my_children:
            p = perm_map.get(cm.id)
            items.append(PermissionMatrixRow(
                menu_id=cm.id,
                menu_name=cm.name,
                parent_id=cm.parent_id,
                level=cm.level,
                can_view=p.can_view if p else False,
                can_create=p.can_create if p else False,
                can_edit=p.can_edit if p else False,
                can_delete=p.can_delete if p else False
            ))
    
    return RolePermissionMatrixResponse(
        role_id=role.id,
        role_name=role.name,
        items=items
    )

@router.post("/roles/{role_id}/matrix", status_code=status.HTTP_204_NO_CONTENT)
def update_role_permission_matrix(
    role_id: int,
    data: PermissionBulkUpdateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Roles", "edit"))
):
    """Bulk update the shared menu/permission mapping for a role."""
    role = role_service.get_role(db, role_id)
    _assert_role_scope_access(role, current_user, db)
    rbac_service.set_role_menu_permissions(db, role, data, acting_user_id=current_user.id)
    return None

@router.get("/permissions/groups")
def get_permission_groups(db: Session = Depends(get_db), current_user: CurrentUser = Depends(require_permission("Roles", "view"))):
    """Return permissions grouped by module_name."""
    permissions = db.query(Permission).filter(Permission.is_active == True).all()
    groups: Dict[str, list] = {}
    for perm in permissions:
        group = perm.module_name or "Other"
        if group not in groups:
            groups[group] = []
        groups[group].append(PermissionResponse.model_validate(perm).dict())
    result = [
        {"group": group, "permissions": perms}
        for group, perms in groups.items()
    ]
    return {"items": result}


@router.get("/users/{user_id}/roles", response_model=List[RoleResponse])
async def get_user_roles(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Roles", "view")),
) -> List[RoleResponse]:
    """Get roles assigned to a user."""
    user = user_service.get_user(db, user_id)
    if not _is_system_admin(current_user, db):
        if current_user.tenant_id is None or user.tenant_id != current_user.tenant_id:
            raise ForbiddenException("Insufficient permissions")
    roles = rbac_service.get_user_roles(db, user_id)
    return roles


@router.post("/users/{user_id}/roles", status_code=status.HTTP_204_NO_CONTENT)
async def set_user_roles(
    user_id: int,
    role_ids: List[int],
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Roles", "edit")),
) -> None:
    """Replace roles assigned to a user."""
    user = user_service.get_user(db, user_id)
    if not _is_system_admin(current_user, db):
        if current_user.tenant_id is None or user.tenant_id != current_user.tenant_id:
            raise ForbiddenException("Insufficient permissions")
    rbac_service.set_user_roles(db, user, role_ids, acting_user_id=current_user.id, acting_user=current_user)
    return None


@router.get("/roles/{role_id}/menus", response_model=List[MenuResponse])
async def get_role_menus(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Roles", "view")),
) -> List[MenuResponse]:
    role = role_service.get_role(db, role_id)
    _assert_role_scope_access(role, current_user, db)
    from app.models.role import role_menus
    menus = db.query(Menu).join(role_menus).filter(role_menus.c.role_id == role.id).all()
    return menus


@router.post("/roles/{role_id}/menus", status_code=status.HTTP_204_NO_CONTENT)
async def set_role_menus(
    role_id: int,
    menu_ids: List[int],
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Roles", "edit")),
) -> None:
    """Replace menus assigned to a role."""
    role = role_service.get_role(db, role_id)
    _assert_role_scope_access(role, current_user, db)
    # Ensure menus exist
    for mid in menu_ids:
        menu_service.get_menu(db, mid)
    rbac_service.set_role_menus(db, role, menu_ids, acting_user_id=current_user.id)
    return None


@router.get("/roles/{role_id}/features", response_model=List[FeatureResponse])
async def get_role_features(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Roles", "view")),
) -> List[FeatureResponse]:
    """Get features assigned to a role."""
    role = role_service.get_role(db, role_id)
    _assert_role_scope_access(role, current_user, db)
    return role.features  # type: ignore[return-value]


@router.post("/roles/{role_id}/features", status_code=status.HTTP_204_NO_CONTENT)
async def set_role_features(
    role_id: int,
    feature_ids: List[int],
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Roles", "edit")),
) -> None:
    """Replace features assigned to a role."""
    role = role_service.get_role(db, role_id)
    _assert_role_scope_access(role, current_user, db)
    # Ensure features exist
    for fid in feature_ids:
        feature_service.get_feature(db, fid)
    rbac_service.set_role_features(db, role, feature_ids, acting_user_id=current_user.id)
    return None

