/**
 * SubMenuItem Component
 * Renders a level 2 menu item (child menu)
 */

import { ListItemButton, ListItemIcon, ListItemText, Tooltip } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import { MenuNode } from "../../types/menu";
import MenuIcon from "./MenuIcon";

interface SubMenuItemProps {
  menu: MenuNode;
  onClick?: () => void;
}

export default function SubMenuItem({ menu, onClick }: SubMenuItemProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  const isActive = menu.path ? location.pathname === menu.path : false;

  const handleClick = () => {
    if (menu.path) {
      navigate(menu.path);
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
          py: 0.75,
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
            <MenuIcon iconName={menu.icon} fontSize="small" />
          </ListItemIcon>
        )}
        <ListItemText
          primary={menu.name}
          primaryTypographyProps={{
            variant: "body2",
            fontSize: "0.875rem",
          }}
        />
      </ListItemButton>
    </Tooltip>
  );
}
