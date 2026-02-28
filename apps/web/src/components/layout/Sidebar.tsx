import { useNavigate, useLocation } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
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
  InputBase,
  IconButton,
  Tooltip,
  Collapse,
  Badge,
  Chip,
  styled,
  alpha,
  Slide,
} from "@mui/material";
import {
  Business as TenantIcon,
  People as UsersIcon,
  Settings as ConfigIcon,
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  Menu as MenuIcon,
  GridView as GridIcon,
  Security as RoleIcon,
  FormatListBulleted as MenuListIcon,
  VpnKey as PermissionIcon,
  Dashboard as DashboardIcon,
  ChevronLeft as ChevronLeftIcon,
} from "@mui/icons-material";
import { useRBAC } from "../../context/RBACContext";
import { useAuth } from "../../context/AuthContext";
import MenuRenderer from "../menu/MenuRenderer";
import MenuIconResolver from "../menu/MenuIcon";

const DRAWER_WIDTH = 280;
const COLLAPSED_DRAWER_WIDTH = 80;

// ============================================
// SUPER ADMIN STYLED COMPONENTS
// ============================================

const SidebarContainer = styled(Box)(({ theme }) => ({
  height: "100%",
  display: "flex",
  flexDirection: "column",
  backgroundColor: "#0d1624",
  color: "#F8FAFC",
  overflow: "hidden",
  borderRight: "1px solid rgba(255, 255, 255, 0.05)",
}));

const SearchWrapper = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(1),
}));

const SearchInput = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  backgroundColor: "rgba(255, 255, 255, 0.05)",
  borderRadius: "8px",
  padding: "8px 12px",
  border: "1px solid transparent",
  transition: "all 0.3s ease",
  "&:focus-within": {
    borderColor: "#38bdf8",
    backgroundColor: "rgba(56, 189, 248, 0.05)",
    boxShadow: `0 0 0 2px ${alpha("#38bdf8", 0.2)}`,
  },
}));

const NavItem = styled(ListItemButton, {
  shouldForwardProp: (prop) => prop !== "active" && prop !== "collapsed",
})<{ active?: boolean; collapsed?: boolean }>(({ theme, active, collapsed }) => ({
  borderRadius: "12px",
  margin: "4px 8px",
  padding: collapsed ? "10px" : "10px 16px",
  justifyContent: collapsed ? "center" : "flex-start",
  transition: "all 0.2s ease",
  position: "relative",
  color: active ? "#38bdf8" : "#94A3B8",
  backgroundColor: active ? alpha("#38bdf8", 0.1) : "transparent",
  "&:hover": {
    backgroundColor: active ? alpha("#38bdf8", 0.15) : "rgba(255, 255, 255, 0.05)",
    color: "#F8FAFC",
    "& .MuiListItemIcon-root": {
      color: "#38bdf8",
    },
  },
  "& .MuiListItemIcon-root": {
    minWidth: collapsed ? 0 : 40,
    color: active ? "#38bdf8" : "inherit",
    justifyContent: "center",
    transition: "color 0.2s ease",
  },
  ...(active && !collapsed && {
    "&::before": {
      content: '""',
      position: "absolute",
      left: 0,
      top: "15%",
      height: "70%",
      width: "4px",
      backgroundColor: "#38bdf8",
      borderRadius: "0 4px 4px 0",
    },
  }),
}));

const SubNavItem = styled(ListItemButton, {
  shouldForwardProp: (prop) => prop !== "active",
})<{ active?: boolean }>(({ theme, active }) => ({
  borderRadius: "12px",
  margin: "2px 8px 2px 48px",
  padding: "8px 16px",
  color: active ? "#38bdf8" : "#94A3B8",
  backgroundColor: active ? alpha("#38bdf8", 0.1) : "transparent",
  "&:hover": {
    backgroundColor: active ? alpha("#38bdf8", 0.15) : "rgba(255, 255, 255, 0.05)",
    color: "#F8FAFC",
  },
  transition: "all 0.2s ease",
  position: "relative",
  "&::before": {
    content: '""',
    position: "absolute",
    left: "-20px",
    top: 0,
    bottom: active ? "50%" : "0",
    width: "1px",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  "&::after": {
    content: '""',
    position: "absolute",
    left: "-20px",
    top: "50%",
    width: "12px",
    height: "1px",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
}));

// SECURITY: Whitelist of allowed routes to prevent open redirect attacks
const ALLOWED_ROUTES = new Set([
  '/tenants',
  '/users',
  '/roles',
  '/menus',
  '/permissions',
  '/dashboard',
  '/profile',
]);

const isAllowedRoute = (path: string | undefined): boolean => {
  if (!path || typeof path !== 'string') return false;
  if (!path.startsWith('/')) return false; // Reject non-relative paths
  return ALLOWED_ROUTES.has(path) || ALLOWED_ROUTES.has(path.split('/')[1]?.replace('?', '') || ''); // Allow dynamic routes like /tenants/123
};

const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return '';
  return input.trim().substring(0, 100); // Limit length and trim
};

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

interface MenuItemData {
  id: string;
  title: string;
  icon: React.ReactNode;
  path?: string;
  children?: { title: string; path: string; icon?: React.ReactNode }[];
}

export default function Sidebar({ mobileOpen, onMobileClose, collapsed, onToggleCollapse }: SidebarProps) {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { menus: rbacMenus } = useRBAC();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);

  // SECURITY: Validate search input
  const handleSearchChange = (value: string) => {
    const sanitized = sanitizeInput(value);
    setSearchTerm(sanitized);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  // Consolidate Menu Items based on role
  const menuItems: MenuItemData[] = useMemo(() => {
    // If Super Admin, use the specific predefined structure
    if (isSuperAdmin) {
      return [
        {
          id: "tenants",
          title: "Tenants",
          icon: <TenantIcon />,
          children: [
            { title: "Tenant Management", path: "/tenants", icon: <GridIcon fontSize="small" /> },
          ],
        },
        {
          id: "users",
          title: "Users",
          icon: <UsersIcon />,
          children: [
            { title: "User Management", path: "/users", icon: <UsersIcon fontSize="small" /> },
          ],
        },
        {
          id: "config",
          title: "Config",
          icon: <ConfigIcon />,
          children: [
            { title: "Role Management", path: "/roles", icon: <RoleIcon fontSize="small" /> },
            { title: "Menu", path: "/menus", icon: <MenuListIcon fontSize="small" /> },
            { title: "Permission", path: "/permissions", icon: <PermissionIcon fontSize="small" /> },
          ],
        },
      ];
    }

    // For other roles, map RBAC menus to MenuItemData structure
    return rbacMenus.map((menu: any) => ({
      id: menu.id,
      title: menu.name,
      icon: <MenuIconResolver iconName={menu.icon} />,
      children: menu.children?.map((child: any) => ({
        title: child.name,
        path: child.path || "#",
        icon: <MenuIconResolver iconName={child.icon} fontSize="small" />
      }))
    }));
  }, [isSuperAdmin, rbacMenus]);

  // Handle section toggling
  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const filteredMenuItems = useMemo(() => {
    if (!searchTerm) return menuItems;
    const lowerSearch = searchTerm.toLowerCase();
    return menuItems
      .map((item) => ({
        ...item,
        children: item.children?.filter((child) =>
          child.title.toLowerCase().includes(lowerSearch)
        ),
      }))
      .filter((item) =>
        item.title.toLowerCase().includes(lowerSearch) ||
        (item.children && item.children.length > 0)
      );
  }, [searchTerm, menuItems]);

  const drawerContent = (
    <SidebarContainer>
      <Toolbar sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: collapsed ? "center" : "space-between",
        px: collapsed ? 1 : 2,
        minHeight: "72px !important",
        mb: 1
      }}>
        {!collapsed && (
          <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: "-0.5px", color: "#38bdf8" }}>
            Control Panel
          </Typography>
        )}
        <IconButton onClick={onToggleCollapse} sx={{ color: "#94A3B8", "&:hover": { color: "#38bdf8" } }}>
          {collapsed ? <MenuIcon /> : <ChevronRightIcon sx={{ transform: "rotate(180deg)" }} />}
        </IconButton>
      </Toolbar>

      {!collapsed && (
        <SearchWrapper>
          <SearchInput>
            <SearchIcon sx={{ color: "#64748B", fontSize: 20, mr: 1 }} />
            <InputBase
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              inputProps={{
                maxLength: 100, // SECURITY: Prevent excessively long input
              }}
              sx={{
                color: "inherit",
                fontSize: "0.875rem",
                width: "100%",
                "& .MuiInputBase-input::placeholder": {
                  color: "#64748B",
                  opacity: 1,
                },
              }}
            />
          </SearchInput>
        </SearchWrapper>
      )}

      {collapsed && (
        <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
          <Tooltip title="Search" placement="right">
            <IconButton onClick={onToggleCollapse} sx={{ color: "#94A3B8" }}>
              <SearchIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      <Box sx={{ flexGrow: 1, overflowY: "auto", overflowX: "hidden", py: 1 }}>
        <List sx={{ px: 0 }}>
          {filteredMenuItems.map((item) => (
            <Box key={item.id} sx={{ mb: 1 }}>
              <Tooltip title={collapsed ? item.title : ""} placement="right">
                <NavItem
                  collapsed={collapsed}
                  onClick={() => (collapsed ? onToggleCollapse() : toggleSection(item.id))}
                  active={location.pathname.startsWith(item.path || "") && item.path !== "/"}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  {!collapsed && (
                    <>
                      <ListItemText
                        primary={item.title}
                        primaryTypographyProps={{ fontSize: "0.9375rem", fontWeight: 600 }}
                      />
                      {item.children && item.children.length > 0 && (
                        <ExpandMoreIcon
                          sx={{
                            fontSize: 18,
                            transition: "transform 0.3s ease",
                            transform: expandedSections[item.id] ? "rotate(0deg)" : "rotate(-90deg)",
                            color: "#64748B"
                          }}
                        />
                      )}
                    </>
                  )}
                </NavItem>
              </Tooltip>

              {item.children && item.children.length > 0 && (
                <Collapse in={expandedSections[item.id] && !collapsed} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {item.children.map((child) => {
                      // SECURITY: Validate route before navigation
                      const isValidRoute = isAllowedRoute(child.path);
                      const isActive = location.pathname === child.path;
                      return isValidRoute ? (
                        <SubNavItem
                          key={child.path}
                          onClick={() => {
                            if (isAllowedRoute(child.path)) {
                              navigate(child.path);
                            }
                          }}
                          active={isActive}
                        >
                          <ListItemText
                            primary={String(child.title || '').substring(0, 100)}
                            primaryTypographyProps={{
                              fontSize: "0.8125rem",
                              fontWeight: isActive ? 600 : 400,
                            }}
                          />
                        </SubNavItem>
                      ) : null;
                    })}
                  </List>
                </Collapse>
              )}
            </Box>
          ))}
        </List>
      </Box>

      <Box sx={{ p: 2, bgcolor: "rgba(0, 0, 0, 0.2)", borderTop: "1px solid rgba(255, 255, 255, 0.05)" }}>
        {!collapsed ? (
          <Box>
            <Typography variant="caption" sx={{ color: "#64748B", display: "block", mb: 0.5, fontWeight: 700, letterSpacing: "1px" }}>
              LOGGED IN AS
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: "#F8FAFC", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "140px" }}>
                {/* SECURITY: Sanitize user display name */}
                {sanitizeInput(user?.full_name || "User")}
              </Typography>
              <Chip
                label={sanitizeInput(user?.role || "USER")}
                size="small"
                sx={{
                  height: "20px",
                  fontSize: "10px",
                  fontWeight: 800,
                  bgcolor: alpha("#38bdf8", 0.1),
                  color: "#38bdf8",
                  border: `1px solid ${alpha("#38bdf8", 0.2)}`,
                }}
              />
            </Box>
          </Box>
        ) : (
          <Tooltip title={`${user?.full_name} (${user?.role})`} placement="right">
            <Box sx={{ display: "flex", justifyContent: "center" }}>
              <Badge variant="dot" color="primary" overlap="circular">
                <UsersIcon sx={{ color: "#38bdf8" }} />
              </Badge>
            </Box>
          </Tooltip>
        )}
      </Box>
    </SidebarContainer>
  );

  return (
    <Slide direction="right" in={mounted} mountOnEnter unmountOnExit>
      <Box
        component="nav"
        sx={{
          width: { md: collapsed ? COLLAPSED_DRAWER_WIDTH : DRAWER_WIDTH },
          flexShrink: { md: 0 },
          transition: theme.transitions.create("width", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={onMobileClose}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: DRAWER_WIDTH,
              borderRight: "none",
              bgcolor: "#0d1624",
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
              width: collapsed ? COLLAPSED_DRAWER_WIDTH : DRAWER_WIDTH,
              borderRight: "none",
              transition: theme.transitions.create("width", {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
              overflowX: "hidden",
              bgcolor: "#0d1624",
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>
    </Slide>
  );
}
