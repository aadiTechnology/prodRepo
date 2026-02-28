/**
 * Sidebar Component
 * Dynamic sidebar with RBAC-based menu rendering
 */

import { useMemo } from "react";
import {
  Drawer,
  Box,
  Toolbar,
  Divider,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { useRBAC } from "../../context/RBACContext";
import MenuRenderer from "../menu/MenuRenderer";
import { MenuNode } from "../../types/menu";

const DRAWER_WIDTH = 280;

/** Static sidebar entry for Role Management (Super Admin). */
const ROLE_MANAGEMENT_MENU: MenuNode = {
  id: 0,
  name: "Role Management",
  path: "/role-management",
  icon: "admin",
  sort_order: 9999,
  level: 1,
  children: [],
};

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { menus, roles } = useRBAC();

  const menusWithRoleManagement = useMemo(() => {
    const showRoleManagement = roles.some((r) =>
      ["SUPER_ADMIN", "ADMIN"].includes(String(r).toUpperCase())
    );
    if (!showRoleManagement) return menus;
    if (menus.some((m) => m.path === "/role-management")) return menus;
    return [...menus, ROLE_MANAGEMENT_MENU];
  }, [menus, roles]);

  const drawerContent = (
    <Box>
      <Toolbar />
      <Divider />
      {menusWithRoleManagement.length > 0 ? (
        <MenuRenderer menus={menusWithRoleManagement} />
      ) : (
        <Box sx={{ p: 2, textAlign: "center", color: "text.secondary" }}>
          No menu items available
        </Box>
      )}
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
    >
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile
        }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: DRAWER_WIDTH,
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" },
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: DRAWER_WIDTH,
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
}
