"""Service layer for Menu CRUD and hierarchical queries."""

from collections import defaultdict
from typing import Iterable, List, Optional

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException
from app.core.logging_config import get_logger
from app.models.menu import Menu
from app.schemas.menu import MenuCreate, MenuUpdate, MenuNode


logger = get_logger(__name__)


def get_menus(db: Session, tenant_id: Optional[int] = None) -> list[Menu]:
    """Return all non-deleted menus, optionally filtered by tenant."""
    query = db.query(Menu).filter(Menu.is_deleted == False)  # noqa: E712
    if tenant_id is not None:
        query = query.filter((Menu.tenant_id == tenant_id) | (Menu.tenant_id.is_(None)))
    return query.order_by(Menu.sort_order, Menu.id).all()


def get_menu(db: Session, menu_id: int) -> Menu:
    """Get a single menu by ID."""
    menu = db.query(Menu).filter(Menu.id == menu_id, Menu.is_deleted == False).first()  # noqa: E712
    if not menu:
        raise NotFoundException("Menu", menu_id)
    return menu


def create_menu(db: Session, data: MenuCreate, created_by: int | None = None) -> Menu:
    """Create a new menu."""
    menu = Menu(
        tenant_id=data.tenant_id,
        parent_id=data.parent_id,
        name=data.name,
        path=data.path,
        icon=data.icon,
        sort_order=data.sort_order,
        level=data.level,
        is_active=data.is_active,
        created_by=created_by,
    )
    db.add(menu)
    db.commit()
    db.refresh(menu)
    logger.info(f"Menu created: {menu.name} (id={menu.id})")
    return menu


def update_menu(db: Session, menu_id: int, data: MenuUpdate, updated_by: int | None = None) -> Menu:
    """Update an existing menu."""
    menu = get_menu(db, menu_id)

    if data.name is not None:
        menu.name = data.name
    if data.path is not None:
        menu.path = data.path
    if data.icon is not None:
        menu.icon = data.icon
    if data.sort_order is not None:
        menu.sort_order = data.sort_order
    if data.is_active is not None:
        menu.is_active = data.is_active

    menu.updated_by = updated_by
    db.commit()
    db.refresh(menu)
    logger.info(f"Menu updated: {menu.name} (id={menu.id})")
    return menu


def soft_delete_menu(db: Session, menu_id: int, deleted_by: int | None = None) -> None:
    """Soft delete a menu (does not cascade to children automatically)."""
    menu = get_menu(db, menu_id)
    menu.is_deleted = True
    menu.deleted_by = deleted_by
    db.commit()
    logger.info(f"Menu soft-deleted: {menu.name} (id={menu.id})")


def build_menu_tree(menus: Iterable[Menu]) -> List[MenuNode]:
    """Build a 2-level menu tree from flat menu records."""
    by_parent: dict[Optional[int], list[Menu]] = defaultdict(list)
    for m in menus:
        by_parent[m.parent_id].append(m)

    # Sort children for stable output
    for children in by_parent.values():
        children.sort(key=lambda m: (m.sort_order, m.id))

    def to_node(menu: Menu) -> MenuNode:
        children = [to_node(child) for child in by_parent.get(menu.id, [])]
        return MenuNode(
            id=menu.id,
            name=menu.name,
            path=menu.path,
            icon=menu.icon,
            children=children,
        )

    roots = by_parent.get(None, [])
    return [to_node(m) for m in roots]

