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
  List,
} from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { useState, memo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MenuNode } from "../../types/menu";
import MenuIcon from "./MenuIcon";
import SubMenuItem from "./SubMenuItem";
import { normalizeMenuPath, hasMenuChildren } from "../../utils/menuNavigation";

// SECURITY: Sanitize menu names to prevent XSS
const sanitizeText = (text: string | undefined): string => {
  if (!text || typeof text !== "string") return "";
  return text.trim().substring(0, 100).replace(/[<>'"]/g, "");
};

interface MenuGroupProps {
  menu: MenuNode;
  defaultExpanded?: boolean;
  collapsed?: boolean;
  searchTerm?: string;
}

function MenuGroupComponent({ menu, defaultExpanded = false, collapsed = false, searchTerm = "" }: MenuGroupProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [expanded, setExpanded] = useState(defaultExpanded);

  const hasChildren = hasMenuChildren(menu.children);
  const menuPath = normalizeMenuPath(menu.path);
  const isActive = menuPath ? location.pathname === menuPath : false;
  const hasActiveChild = menu.children?.some(
    (child) => {
      const childPath = normalizeMenuPath(child.path);
      return childPath ? location.pathname === childPath : false;
    }
  );

  const handleClick = () => {
    if (collapsed) return;
    if (menuPath) {
      navigate(menuPath);
      return;
    }
    if (hasChildren) {
      setExpanded(!expanded);
    }
  };

  // Auto-expand if child is active or if searching
  const isSearchMatch = Boolean(searchTerm) && (
    menu.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    menu.children?.some(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const shouldShowExpanded = !collapsed && (expanded || hasActiveChild || isSearchMatch);

  return (
    <>
      <Tooltip title={collapsed ? sanitizeText(menu.name) : ""} placement="right">
        <ListItemButton
          onClick={handleClick}
          selected={isActive && !hasChildren}
          sx={{
            py: 1,
            mb: 0.5,
            borderRadius: 2,
            justifyContent: collapsed ? "center" : "flex-start",
            px: collapsed ? 1 : 2,
            transition: 'all 0.2s',
            "&.Mui-selected": {
              backgroundColor: "rgba(56, 189, 248, 0.1)",
              color: "#38BDF8",
              "&:hover": {
                backgroundColor: "rgba(56, 189, 248, 0.15)",
              },
            },
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 0.05)",
            }
          }}
        >
          {menu.icon && (
            <ListItemIcon sx={{
              minWidth: collapsed ? 0 : 40,
              color: isActive || hasActiveChild ? "#38BDF8" : "#94A3B8",
              justifyContent: 'center'
            }}>
              <MenuIcon iconName={menu.icon} />
            </ListItemIcon>
          )}
          {!collapsed && (
            <ListItemText
              primary={sanitizeText(menu.name)}
              primaryTypographyProps={{
                fontSize: '0.875rem',
                fontWeight: hasActiveChild || isActive ? 600 : 500,
                color: hasActiveChild || isActive ? "#38BDF8" : "inherit"
              }}
            />
          )}
          {hasChildren && !collapsed && (
            shouldShowExpanded ?
              <ExpandLess sx={{ fontSize: 18, color: "rgba(255,255,255,0.3)" }} /> :
              <ExpandMore sx={{ fontSize: 18, color: "rgba(255,255,255,0.3)" }}
              />
          )}
        </ListItemButton>
      </Tooltip>

      {hasChildren && !collapsed && (
        <Collapse in={shouldShowExpanded} timeout="auto" unmountOnExit>
          <List component="div" disablePadding sx={{ pl: 1 }}>
            {menu.children!.map((child) => (
              <SubMenuItem key={child.id} menu={child} />
            ))}
          </List>
        </Collapse>
      )}
    </>
  );
}

// OPTIMIZATION: Memoize to prevent re-renders when parent updates
// This prevents unnecessary re-renders of all siblings when one menu item changes
export default memo(MenuGroupComponent);
