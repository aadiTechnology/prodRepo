"""RBAC assignment endpoints (user roles, role menus, role features)."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.dependencies import require_admin, CurrentUser
from app.core.exceptions import NotFoundException
from app.models.user import User
from app.models.role import Role
from app.models.menu import Menu
from app.models.feature import Feature
from app.schemas.role import RoleResponse
from app.schemas.menu import MenuResponse
from app.schemas.feature import FeatureResponse
from app.schemas.auth import UserWithRole
from app.services import rbac_service, role_service, menu_service, feature_service, user_service


router = APIRouter(prefix="/rbac", tags=["RBAC"])


@router.get("/users/{user_id}/roles", response_model=List[RoleResponse])
async def get_user_roles(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin),
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
    current_user: CurrentUser = Depends(require_admin),
) -> None:
    """Replace roles assigned to a user."""
    user = user_service.get_user(db, user_id)
    rbac_service.set_user_roles(db, user, role_ids, acting_user_id=current_user.id)
    return None


@router.get("/roles/{role_id}/menus", response_model=List[MenuResponse])
async def get_role_menus(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin),
) -> List[MenuResponse]:
    """Get menus assigned to a role."""
    role = role_service.get_role(db, role_id)
    return role.menus  # type: ignore[return-value]


@router.post("/roles/{role_id}/menus", status_code=status.HTTP_204_NO_CONTENT)
async def set_role_menus(
    role_id: int,
    menu_ids: List[int],
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin),
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
    current_user: CurrentUser = Depends(require_admin),
) -> List[FeatureResponse]:
    """Get features assigned to a role."""
    role = role_service.get_role(db, role_id)
    return role.features  # type: ignore[return-value]


@router.post("/roles/{role_id}/features", status_code=status.HTTP_204_NO_CONTENT)
async def set_role_features(
    role_id: int,
    feature_ids: List[int],
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin),
) -> None:
    """Replace features assigned to a role."""
    role = role_service.get_role(db, role_id)
    # Ensure features exist
    for fid in feature_ids:
        feature_service.get_feature(db, fid)
    rbac_service.set_role_features(db, role, feature_ids, acting_user_id=current_user.id)
    return None

