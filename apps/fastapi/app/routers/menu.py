"""Menu CRUD endpoints."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.core.dependencies import require_admin, CurrentUser
from app.schemas.menu import MenuCreate, MenuUpdate, MenuResponse
from app.services import menu_service


router = APIRouter(prefix="/menus", tags=["Menus"])


@router.get("/", response_model=List[MenuResponse])
async def list_menus(
    tenant_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin),
) -> List[MenuResponse]:
    """List menus (optionally filtered by tenant)."""
    menus = menu_service.get_menus(db, tenant_id=tenant_id)
    return menus


@router.get("/{menu_id}", response_model=MenuResponse)
async def get_menu(
    menu_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin),
) -> MenuResponse:
    """Get a single menu."""
    return menu_service.get_menu(db, menu_id)


@router.post("/", response_model=MenuResponse, status_code=status.HTTP_201_CREATED)
async def create_menu(
    data: MenuCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin),
) -> MenuResponse:
    """Create a new menu."""
    return menu_service.create_menu(db, data, created_by=current_user.id)


@router.put("/{menu_id}", response_model=MenuResponse)
async def update_menu(
    menu_id: int,
    data: MenuUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin),
) -> MenuResponse:
    """Update an existing menu."""
    return menu_service.update_menu(db, menu_id, data, updated_by=current_user.id)


@router.delete("/{menu_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_menu(
    menu_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin),
) -> None:
    """Soft delete a menu."""
    menu_service.soft_delete_menu(db, menu_id, deleted_by=current_user.id)
    return None

