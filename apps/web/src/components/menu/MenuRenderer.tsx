/**
 * MenuRenderer Component
 * Renders the complete menu hierarchy
 */

import { List } from "@mui/material";
import { useMemo } from "react";
import { MenuNode } from "../../types/menu";
import MenuGroup from "./MenuGroup";

interface MenuRendererProps {
  menus: MenuNode[];
  collapsed?: boolean;
  searchTerm?: string;
}

export default function MenuRenderer({ menus, collapsed = false, searchTerm = "" }: MenuRendererProps) {
  // SECURITY: Sort menus by sort_order with null checks
  const sortedMenus = useMemo(() => {
    return [...menus].sort((a, b) => {
      const orderA = typeof a.sort_order === 'number' ? a.sort_order : 999;
      const orderB = typeof b.sort_order === 'number' ? b.sort_order : 999;
      return orderA - orderB;
    });
  }, [menus]);

  // SECURITY: Sort children within each menu with null checks
  const menusWithSortedChildren = useMemo(() => {
    return sortedMenus.map((menu) => {
      if (menu.children && Array.isArray(menu.children) && menu.children.length > 0) {
        return {
          ...menu,
          children: [...menu.children].sort((a, b) => {
            const orderA = typeof a.sort_order === 'number' ? a.sort_order : 999;
            const orderB = typeof b.sort_order === 'number' ? b.sort_order : 999;
            return orderA - orderB;
          }),
        };
      }
      return menu;
    });
  }, [sortedMenus]);

  return (
    <List component="nav" sx={{ width: "100%", px: collapsed ? 0 : 1 }}>
      {menusWithSortedChildren.map((menu) => (
        <MenuGroup
          key={menu.id}
          menu={menu}
          collapsed={collapsed}
          searchTerm={searchTerm}
          defaultExpanded={Boolean(searchTerm)}
        />
      ))}
    </List>
  );
}
