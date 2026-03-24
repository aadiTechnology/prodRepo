"""RBAC assignment endpoints (user roles, role menus, role features)."""

from fastapi import APIRouter, Depends, status  # type: ignore
from fastapi.responses import JSONResponse  # type: ignore
from sqlalchemy.orm import Session  # type: ignore
from typing import List, Dict

from app.core.database import get_db  # type: ignore
from app.core.dependencies import require_admin, require_permission, CurrentUser  # type: ignore
from app.core.exceptions import NotFoundException  # type: ignore
from app.models.user import User  # type: ignore
from app.models.role import Role  # type: ignore
from app.models.menu import Menu  # type: ignore
from app.models.feature import Feature  # type: ignore
from app.schemas.role import RoleResponse  # type: ignore
from app.schemas.menu import MenuResponse  # type: ignore
from app.schemas.feature import FeatureResponse  # type: ignore
from app.schemas.auth import UserWithRole  # type: ignore
from app.services import rbac_service, role_service, menu_service, feature_service, user_service  # type: ignore
from app.models.permission import Permission  # type: ignore
from app.schemas.permission import PermissionResponse  # type: ignore
from app.schemas.rbac_mgmt import RolePermissionMatrixResponse, PermissionMatrixRow, PermissionBulkUpdateRequest  # type: ignore
from app.models.role_menu_permission import RoleMenuPermission  # type: ignore

router = APIRouter(prefix="/rbac", tags=["RBAC"])

@router.get("/roles/{role_id}/matrix", response_model=RolePermissionMatrixResponse)
def get_role_permission_matrix(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Permission Mapping", "view"))
):
    """Fetch the full menu/permission grid for a role."""
    role = role_service.get_role(db, role_id)
    
    # 1. Fetch available menus (filtered by tenant AND caller's own access)
    user = user_service.get_user(db, current_user.id)
    all_menus = rbac_service.get_user_accessible_menus(db, user)
    
    # 2. Further filter by the target role's tenant scope
    target_tenant_id = role.tenant_id if role.tenant_id is not None else current_user.tenant_id
    all_menus = [m for m in all_menus if m.tenant_id is None or m.tenant_id == target_tenant_id]
    
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
    current_user: CurrentUser = Depends(require_permission("Permission Mapping", "edit"))
):
    """Bulk update the shared menu/permission mapping for a role."""
    role = role_service.get_role(db, role_id)
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
    # Ensure user exists
    user_service.get_user(db, user_id)
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
    rbac_service.set_user_roles(db, user, role_ids, acting_user_id=current_user.id)
    return None


@router.get("/roles/{role_id}/menus", response_model=List[MenuResponse])
async def get_role_menus(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Roles", "view")),
) -> List[MenuResponse]:
    role = role_service.get_role(db, role_id)
    from app.models.role import role_menus  # type: ignore
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
    # Ensure features exist
    for fid in feature_ids:
        feature_service.get_feature(db, fid)
    rbac_service.set_role_features(db, role, feature_ids, acting_user_id=current_user.id)
    return None

