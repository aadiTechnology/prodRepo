import { useNavigate } from "react-router-dom";
import {
  Drawer,
  Box,
  Toolbar,
  Divider,
  useTheme,
  useMediaQuery,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";
import {
  Business as TenantIcon,
  Dashboard as DashboardIcon
} from "@mui/icons-material";
import { useRBAC } from "../../context/RBACContext";
import { useAuth } from "../../context/AuthContext";
import MenuRenderer from "../menu/MenuRenderer";

const DRAWER_WIDTH = 280;

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { menus } = useRBAC();
  const { user } = useAuth();

  /** Role constant — update to an enum import if the auth context ever changes */
  const SUPER_ADMIN_ROLE = "SUPER_ADMIN" as const;
  const isSuperAdmin = user?.role === SUPER_ADMIN_ROLE;

  const drawerContent = (
    <Box>
      <Toolbar>
        <Typography variant="h6" sx={{ fontWeight: 700, color: "primary.main" }}>
          Control Panel
        </Typography>
      </Toolbar>
      <Divider />

      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={() => navigate("/")}>
            <ListItemIcon><DashboardIcon /></ListItemIcon>
            <ListItemText primary="Users" />
          </ListItemButton>
        </ListItem>

        {isSuperAdmin && (
          <ListItem disablePadding>
            <ListItemButton onClick={() => navigate("/tenants")} sx={{ bgcolor: "rgba(25, 118, 210, 0.08)" }}>
              <ListItemIcon><TenantIcon color="primary" /></ListItemIcon>
              <ListItemText primary="Tenants" primaryTypographyProps={{ fontWeight: 600, color: "primary.main" }} />
            </ListItemButton>
          </ListItem>
        )}
      </List>

      <Divider sx={{ my: 1 }} />

      {menus.length > 0 ? (
        <MenuRenderer menus={menus} />
      ) : (
        <Box sx={{ p: 2, textAlign: "center", color: "text.secondary" }}>
          <Typography variant="caption">No additional modules</Typography>
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
