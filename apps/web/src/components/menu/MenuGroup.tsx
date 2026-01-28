/**
 * MenuGroup Component
 * Renders a level 1 menu item with expandable children
 */

import {
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Tooltip,
} from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MenuNode } from "../../types/menu";
import MenuIcon from "./MenuIcon";
import SubMenuItem from "./SubMenuItem";

interface MenuGroupProps {
  menu: MenuNode;
  defaultExpanded?: boolean;
}

export default function MenuGroup({ menu, defaultExpanded = false }: MenuGroupProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [expanded, setExpanded] = useState(defaultExpanded);

  const hasChildren = menu.children && menu.children.length > 0;
  const isActive = menu.path ? location.pathname === menu.path : false;
  const hasActiveChild = menu.children?.some(
    (child) => child.path && location.pathname === child.path
  );

  const handleClick = () => {
    if (hasChildren) {
      setExpanded(!expanded);
    } else if (menu.path) {
      navigate(menu.path);
    }
  };

  // Auto-expand if child is active
  const shouldExpand = expanded || hasActiveChild;

  return (
    <>
      <Tooltip title={menu.name} placement="right">
        <ListItemButton
          onClick={handleClick}
          selected={isActive && !hasChildren}
          sx={{
            py: 1,
            "&.Mui-selected": {
              backgroundColor: (theme) =>
                theme.palette.mode === "light"
                  ? theme.palette.primary.light
                  : theme.palette.primary.dark,
              "&:hover": {
                backgroundColor: (theme) =>
                  theme.palette.mode === "light"
                    ? theme.palette.primary.light
                    : theme.palette.primary.dark,
              },
            },
          }}
        >
          {menu.icon && (
            <ListItemIcon sx={{ minWidth: 40 }}>
              <MenuIcon iconName={menu.icon} />
            </ListItemIcon>
          )}
          <ListItemText
            primary={menu.name}
            primaryTypographyProps={{
              variant: "body1",
              fontWeight: hasActiveChild ? 600 : 400,
            }}
          />
          {hasChildren && (shouldExpand ? <ExpandLess /> : <ExpandMore />)}
        </ListItemButton>
      </Tooltip>

      {hasChildren && (
        <Collapse in={shouldExpand} timeout="auto" unmountOnExit>
          {menu.children!.map((child) => (
            <SubMenuItem key={child.id} menu={child} />
          ))}
        </Collapse>
      )}
    </>
  );
}
