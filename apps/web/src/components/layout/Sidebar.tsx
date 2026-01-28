/**
 * Sidebar Component
 * Dynamic sidebar with RBAC-based menu rendering
 */

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

const DRAWER_WIDTH = 280;

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { menus } = useRBAC();

  const drawerContent = (
    <Box>
      <Toolbar />
      <Divider />
      {menus.length > 0 ? (
        <MenuRenderer menus={menus} />
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
