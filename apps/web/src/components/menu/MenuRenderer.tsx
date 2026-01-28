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
}

export default function MenuRenderer({ menus }: MenuRendererProps) {
  // Sort menus by sort_order
  const sortedMenus = useMemo(() => {
    return [...menus].sort((a, b) => a.sort_order - b.sort_order);
  }, [menus]);

  // Sort children within each menu
  const menusWithSortedChildren = useMemo(() => {
    return sortedMenus.map((menu) => {
      if (menu.children && menu.children.length > 0) {
        return {
          ...menu,
          children: [...menu.children].sort((a, b) => a.sort_order - b.sort_order),
        };
      }
      return menu;
    });
  }, [sortedMenus]);

  return (
    <List component="nav" sx={{ width: "100%", px: 1 }}>
      {menusWithSortedChildren.map((menu) => (
        <MenuGroup key={menu.id} menu={menu} />
      ))}
    </List>
  );
}
