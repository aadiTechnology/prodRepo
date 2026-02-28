/**
 * SubMenuItem Component
 * Renders a level 2 menu item (child menu)
 */

import { ListItemButton, ListItemIcon, ListItemText, Tooltip } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import { MenuNode } from "../../types/menu";
import MenuIcon from "./MenuIcon";

const isValidRoute = (path: string | null | undefined): boolean => {
  if (!path || typeof path !== 'string') return false;
  if (!path.startsWith('/')) return false;
  return true;
};

const sanitizeText = (text: string | undefined): string => {
  if (!text || typeof text !== 'string') return '';
  return text.trim().substring(0, 100).replace(/[<>'"]/g, '');
};

interface SubMenuItemProps {
  menu: MenuNode;
  onClick?: () => void;
}

export default function SubMenuItem({ menu, onClick }: SubMenuItemProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = menu.path ? location.pathname === menu.path : false;

  const handleClick = () => {
    if (isValidRoute(menu.path)) {
      navigate(menu.path as string);
    }
    onClick?.();
  };

  return (
    <Tooltip title={menu.name} placement="right">
      <ListItemButton
        onClick={handleClick}
        selected={isActive}
        sx={{
          pl: 4,
          py: 0.5,
          mb: 0.25,
          borderRadius: 2,
          transition: 'all 0.2s',
          "&.Mui-selected": {
            backgroundColor: "rgba(56, 189, 248, 0.08)",
            color: "#38BDF8",
            "&:hover": {
              backgroundColor: "rgba(56, 189, 248, 0.12)",
            },
          },
          "&:hover": {
            backgroundColor: "rgba(255, 255, 255, 0.03)",
          }
        }}
      >
        {menu.icon && (
          <ListItemIcon sx={{
            minWidth: 32,
            color: isActive ? "#38BDF8" : "rgba(148, 163, 184, 0.7)",
            justifyContent: 'center'
          }}>
            <MenuIcon iconName={menu.icon} fontSize="small" />
          </ListItemIcon>
        )}
        <ListItemText
          primary={sanitizeText(menu.name)}
          primaryTypographyProps={{
            fontSize: "0.8125rem",
            fontWeight: isActive ? 600 : 400,
            color: isActive ? "#38BDF8" : "rgba(248, 250, 252, 0.7)"
          }}
        />
      </ListItemButton>
    </Tooltip>
  );
}
