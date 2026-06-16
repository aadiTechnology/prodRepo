/**
 * Sidebar Component - Main navigation sidebar with dynamic menu rendering
 * Renders menu items based on user's RBAC permissions
 * Supports collapsible state, search, and nested menu items
 */

import { useNavigate, useLocation } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import {
  Drawer,
  Box,
  Toolbar,
  useTheme,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  IconButton,
  Tooltip,
  Collapse,
  Avatar,
  styled,
  alpha,
  Slide,
  InputBase,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  Menu as MenuIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import { useAuth } from "../../context/AuthContext";
import { useRBAC } from "../../context/RBACContext";
import { colorTokens } from "../../tokens/colors";
import { normalizeMenuPath, hasMenuChildren } from "../../utils/menuNavigation";
import { toRoleLabel } from "../../utils/formatters";

// ═══════════════════════════════════════════════════════════════════════════
// Asset Icons - Menu item icons
// ═══════════════════════════════════════════════════════════════════════════
// Import Icons from assets
import userIcon from "../../assets/icons/user.png";
import teamworkIcon from "../../assets/icons/teamwork.png";
import workingIcon from "../../assets/icons/working.png";
import schoolIcon from "../../assets/icons/school.png";
import assetsIcon from "../../assets/icons/assets.png";
import moneyIcon from "../../assets/icons/money.png";
import feesIcon from "../../assets/icons/fees.png";
import staffIcon from "../../assets/icons/staff.png";
import calendarIcon from "../../assets/icons/calendar.png";
import educationalIcon from "../../assets/icons/educational.png";
import groupingIcon from "../../assets/icons/grouping.png";
import idCardIcon from "../../assets/icons/id-card.png";
import letterIcon from "../../assets/icons/letter.png";
import bloggerIcon from "../../assets/icons/blogger.png";

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════
const DRAWER_WIDTH = 280;
const COLLAPSED_DRAWER_WIDTH = 88;

// ═══════════════════════════════════════════════════════════════════════════
// Styled Components
// ═══════════════════════════════════════════════════════════════════════════
const SidebarContainer = styled(Box)(({ theme }) => ({
  height: "100%",
  display: "flex",
  flexDirection: "column",
  background: colorTokens.sidebar.background,
  color: colorTokens.sidebar.text.primary,
  overflow: "hidden",
  borderRight: `1px solid ${colorTokens.sidebar.border}`,
  boxShadow: "4px 0 24px rgba(0, 0, 0, 0.04)",
}));

const HeaderGradient = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3, 2),
  background: `linear-gradient(135deg, ${colorTokens.preschool.turquoise.main} 0%, ${colorTokens.primary.main} 100%)`,
  borderRadius: "0 0 40px 40px",
  marginBottom: theme.spacing(1),
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  color: "#ffffff",
  boxShadow: `0 8px 20px ${alpha(colorTokens.preschool.turquoise.main, 0.25)}`,
  transition: "all 0.3s ease",
}));

const SearchWrapper = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1, 2, 2, 2),
}));

const SearchInput = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  backgroundColor: alpha("#ffffff", 0.8),
  borderRadius: "15px",
  padding: "6px 12px",
  border: `1px solid ${alpha(colorTokens.preschool.turquoise.main, 0.2)}`,
  transition: "all 0.3s ease",
  "&:focus-within": {
    borderColor: colorTokens.preschool.turquoise.main,
    backgroundColor: "#ffffff",
    boxShadow: `0 0 0 3px ${alpha(colorTokens.preschool.turquoise.main, 0.1)}`,
  },
}));

const NavItem = styled(ListItemButton, {
  shouldForwardProp: (prop) => prop !== "active" && prop !== "collapsed" && prop !== "itemColor",
})<{ active?: boolean; collapsed?: boolean; itemColor?: string }>(({ theme, active, collapsed, itemColor }) => ({
  borderRadius: "20px",
  margin: "2px 4px",
  padding: collapsed ? "2px" : "3px 6px",
  justifyContent: collapsed ? "center" : "flex-start",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  backgroundColor: active ? alpha(itemColor || colorTokens.preschool.turquoise.main, 0.12) : "transparent",
  color: active ? (itemColor || colorTokens.sidebar.text.primary) : colorTokens.sidebar.text.secondary,
  borderLeft: active ? `6px solid ${itemColor || colorTokens.preschool.turquoise.main}` : "0px solid transparent",
  "&:hover": {
    backgroundColor: alpha(itemColor || colorTokens.preschool.turquoise.main, 0.08),
    transform: "translateX(4px)",
    "& .MuiListItemIcon-root img": {
      filter: "grayscale(0%) brightness(100%)",
      transform: "scale(1.1)",
    },
  },
  "& .MuiListItemIcon-root": {
    minWidth: collapsed ? 0 : 42,
    justifyContent: "center",
    transition: "all 0.3s ease",
    "& img": {
      width: 24,
      height: 24,
      filter: active ? "grayscale(0%)" : "grayscale(100%) opacity(0.6)",
      transition: "all 0.3s ease",
    },
  },
}));

const SubNavItem = styled(ListItemButton, {
  shouldForwardProp: (prop) => prop !== "active",
})<{ active?: boolean }>(({ theme, active }) => ({
  borderRadius: "15px",
  margin: "2px 16px 2px 58px",
  padding: "8px 16px",
  color: active ? colorTokens.primary.main : colorTokens.sidebar.text.secondary,
  backgroundColor: active ? alpha(colorTokens.primary.main, 0.08) : "transparent",
  transition: "all 0.2s ease",
  "&:hover": {
    backgroundColor: alpha(colorTokens.primary.main, 0.05),
    color: colorTokens.sidebar.text.primary,
  },
}));

const ProfileCard = styled(Box, {
  shouldForwardProp: (prop) => prop !== "collapsed",
})<{ collapsed?: boolean }>(({ theme, collapsed }) => ({
  margin: theme.spacing(2),
  padding: collapsed ? theme.spacing(1) : theme.spacing(1.5, 2),
  backgroundColor: "#ffffff",
  borderRadius: "24px",
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1.5),
  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.03)",
  border: `1px solid ${alpha(colorTokens.sidebar.text.muted, 0.1)}`,
  marginTop: "auto",
  marginBottom: theme.spacing(3),
  transition: "all 0.3s ease",
  "&:hover": {
    transform: "translateY(-4px)",
    boxShadow: "0 15px 35px rgba(0, 0, 0, 0.08)",
    borderColor: colorTokens.preschool.turquoise.light,
  },
}));

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

interface MenuItemData {
  id: string;
  label: string;
  icon: string;
  path?: string;
  color?: string;
  children?: { id: string; label: string; path: string }[];
}

// ═══════════════════════════════════════════════════════════════════════════
// Icon Mapping
// ═══════════════════════════════════════════════════════════════════════════
const ICON_MAP: Record<string, string> = {
  "dashboard": workingIcon,
  "students": idCardIcon,
  "academics": educationalIcon,
  "academic-years": calendarIcon,
  "fees": feesIcon,
  "staff": staffIcon,
  "finance": moneyIcon,
  "settings": assetsIcon,
  "tenants": groupingIcon,
  "users": userIcon,
  "attendance": calendarIcon,
  "config": assetsIcon,
  "admissions": letterIcon,
  "marketing": bloggerIcon,
  "default": workingIcon
};


const COLOR_MAP: Record<string, string> = {
  "dashboard": colorTokens.menuColors.dashboard,
  "students": colorTokens.menuColors.students,
  "academics": colorTokens.menuColors.academics,
  "academic-years": colorTokens.menuColors.academics,
  "fees": colorTokens.menuColors.fees,
  "staff": colorTokens.menuColors.staff,
  "finance": colorTokens.menuColors.finance,
  "settings": colorTokens.menuColors.settings,
  "tenants": colorTokens.menuColors.students,
  "users": colorTokens.menuColors.academics,
  "attendance": colorTokens.menuColors.academics,
  "config": colorTokens.menuColors.settings,
  "marketing": colorTokens.menuColors.students,
};


const SYSTEM_ADMIN_MENU: MenuItemData[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: workingIcon,
    path: "/",
    color: colorTokens.menuColors.dashboard,
  },
  {
    id: "tenants",
    label: "Tenants",
    icon: groupingIcon,
    color: colorTokens.menuColors.students,
    children: [
      { id: "tenant-management", label: "Tenant Management", path: "/tenants" }
    ]
  },
  {
    id: "attendance",
    label: "Attendance",
    icon: calendarIcon,
    color: colorTokens.menuColors.academics,
    children: [
      { id: "mark-attendance", label: "Mark Attendance", path: "/attendance/mark" }
    ]
  },
  {
    id: "users",

    label: "Users",
    icon: userIcon,
    color: colorTokens.menuColors.academics,
    children: [
      { id: "user-management", label: "User Management", path: "/users" }
    ]
  },
  {
    id: "system-config",
    label: "System Config",
    icon: assetsIcon,
    color: colorTokens.menuColors.settings,
    children: [
      { id: "role-management", label: "Role Management", path: "/roles" },
      { id: "permission-management", label: "Permission Management", path: "/admin/permission-management" },
      { id: "theme-studio", label: "Theme Studio", path: "/admin/theme-studio" },
      { id: "ai-review", label: "AI Review", path: "/ai/review" },
      { id: "story-generation", label: "Story Generation", path: "/ai/generate" },
      { id: "sprint-performance", label: "Sprint Performance", path: "/reports/sprint-performance" },
      { id: "sprintwise-performance", label: "Sprintwise Performance", path: "/reports/sprintwise-performance" },
      { id: "my-tasks-effort", label: "My Tasks — Effort Entry", path: "/my-tasks/effort-entry" },
      { id: "sprints", label: "Sprints", path: "/sprints" },
      { id: "demo-setup-videos", label: "Demo Setup Videos", path: "/demo-setup-videos" },
      // { id: "digital-marketing-hub", label: "Digital Marketing Hub", path: "/marketing/hub" }
    ]
  }
];

/**
 * These level-1 modules are accessible only inside ConfigurationHub (/configuration).
 * They must NOT appear as standalone sidebar items.
 * Filtered by name since level-1 modules have parent_id=NULL by DB constraint design.
 */
const HUB_CHILD_MODULE_NAMES = new Set([
  "User Related",
  "Academics",
  "Fees Related",
]);

export default function Sidebar({ mobileOpen, onMobileClose, collapsed, onToggleCollapse }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { menus, roles: rbacRoles } = useRBAC();
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset logo error when tenant changes
  useEffect(() => {
    setLogoError(false);
  }, [user?.tenant?.id, user?.tenant?.logo_url]);

  // Initialize expandedSections based on current path and menuItems
  useEffect(() => {
    const initialExpanded: Record<string, boolean> = {};
    menuItems.forEach(item => {
      if (
        location.pathname === item.path ||
        (item.children?.some(child => location.pathname === child.path) ?? false)
      ) {
        initialExpanded[item.id] = true;
      }
    });
    setExpandedSections(initialExpanded);
    // Only run when menuItems or location.pathname changes
  }, [menus, user, location.pathname]);

  const menuItems: MenuItemData[] = useMemo(() => {
    if (rbacRoles.includes("super_admin")) {
      return SYSTEM_ADMIN_MENU;
    }

    if (!menus || menus.length === 0) return [];

    // Exclude modules that belong inside ConfigurationHub only
    const sidebarMenus = menus.filter(
      node => !HUB_CHILD_MODULE_NAMES.has(node.name)
    );

    const items = sidebarMenus.map(node => {
      const path = (node.path || "").toLowerCase();
      const name = (node.name || "").toLowerCase();
      
      let icon = workingIcon;
      if (path.includes("fee") || name.includes("fee")) icon = feesIcon;
      else if (path.includes("administration") || name.includes("administration")) icon = groupingIcon;
      else if (path.includes("admission") || name.includes("admission")) icon = letterIcon;
      else if (path.includes("student") || name.includes("student")) icon = idCardIcon;
      else if (path.includes("user") || name.includes("user")) icon = userIcon;
      else if (path.includes("academic") || path.includes("class") || name.includes("academic") || name.includes("class")) icon = educationalIcon;
      else if (path.includes("tenant") || name.includes("tenant")) icon = groupingIcon;
      else if (path.includes("attendance") || name.includes("attendance")) icon = calendarIcon;
      else if (path.includes("staff") || name.includes("staff")) icon = staffIcon;
      else if (path.includes("role") || name.includes("role") || path.includes("permission") || name.includes("permission")) icon = teamworkIcon;
      else if (path.includes("finance") || name.includes("finance")) icon = moneyIcon;
      else if (path.includes("setting") || path.includes("config") || path.includes("admin") || name.includes("setting") || name.includes("config") || name.includes("theme")) icon = assetsIcon;

      // Keep default coloring logic or simplify
      const slug = path.replace(/\//g, "") || "dashboard";
      const color = COLOR_MAP[slug] || COLOR_MAP[node.icon || ""] || colorTokens.menuColors.dashboard;

      return {
        id: node.id.toString(),
        label: node.name,
        icon: icon,
        path: normalizeMenuPath(node.path) ?? undefined,
        color: color,
        children: hasMenuChildren(node.children)
          ? node.children!.map(child => ({
              id: child.id.toString(),
              label: child.name,
              path: normalizeMenuPath(child.path) ?? "",
            }))
          : undefined,
      };
    });

    // const hasMarketingHub = menus.some(node => (node.path || "").toLowerCase().includes("marketing"));
    // const isAdmin = rbacRoles.some(role => role.toLowerCase().includes("admin"));
    // if (isAdmin && !hasMarketingHub) {
    //   items.push({
    //     id: "digital-marketing-hub",
    //     label: "Marketing Hub",
    //     icon: bloggerIcon,
    //     path: "/marketing/hub",
    //     color: colorTokens.menuColors.students,
    //     children: undefined,
    //   });
    // }

    return items;
  }, [menus, user, rbacRoles]);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const isCurrentlyExpanded = prev[id];
      const newState: Record<string, boolean> = {};
      
      // Close all sections first
      Object.keys(prev).forEach(key => {
        newState[key] = false;
      });
      
      // If the clicked section wasn't expanded, expand only this one
      if (!isCurrentlyExpanded) {
        newState[id] = true;
      }
      
      return newState;
    });
  };

  const handleMenuNavigate = (path: string) => {
    navigate(path);
    onMobileClose();
  };

  const filteredItems = useMemo(() => {
    if (!searchTerm) return menuItems;
    const term = searchTerm.toLowerCase();
    return menuItems.filter(item => 
      item.label.toLowerCase().includes(term) || 
      item.children?.some(child => child.label.toLowerCase().includes(term))
    );
  }, [searchTerm, menuItems]);

  const drawerContent = (
    <SidebarContainer>
      <HeaderGradient>
        {!collapsed && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                bgcolor: "#ffffff",
                borderRadius: "10px",
                padding: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 10px rgba(0,0,0,0.1)"
              }}
            >
              <img 
                src={user?.tenant?.logo_url && !logoError ? user.tenant.logo_url : educationalIcon} 
                alt="Logo" 
                style={{ width: "100%", height: "100%", objectFit: "contain" }} 
                onError={() => setLogoError(true)}
              />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 900, fontSize: "1rem", color: "#ffffff" }}>
              {user?.tenant?.name || "Campus Axis"}
            </Typography>
          </Box>
        )}
        <IconButton
          onClick={onToggleCollapse}
          sx={{
            color: "#ffffff",
            bgcolor: alpha("#ffffff", 0.15),
            "&:hover": { bgcolor: alpha("#ffffff", 0.25) }
          }}
          size="small"
        >
          {collapsed ? <MenuIcon fontSize="small" /> : <ChevronRightIcon sx={{ transform: "rotate(180deg)" }} fontSize="small" />}
        </IconButton>
      </HeaderGradient>

      {!collapsed && (
        <SearchWrapper>
          <SearchInput>
            <SearchIcon sx={{ color: alpha(colorTokens.preschool.turquoise.main, 0.6), fontSize: 18, mr: 1 }} />
            <InputBase
              placeholder="Quick Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ fontSize: "0.85rem", width: "100%", fontWeight: 500, color: colorTokens.sidebar.text.primary }}
            />
          </SearchInput>
        </SearchWrapper>
      )}

      <Box sx={{ 
        flexGrow: 1, 
        overflowY: "auto", 
        overflowX: "hidden", 
        px: 1,
        "&::-webkit-scrollbar": { width: "4px" }, 
        "&::-webkit-scrollbar-thumb": { backgroundColor: alpha(colorTokens.preschool.turquoise.main, 0.2), borderRadius: "2px" } 
      }}>
        <List sx={{ pt: 1 }}>
          {filteredItems.map((item) => {
            const isActive = location.pathname === item.path || (item.children?.some(child => location.pathname === child.path) ?? false);
            const isSectionExpanded = !!expandedSections[item.id];

            return (
              <Box key={item.id} sx={{ mb: 0.5 }}>
                <Tooltip title={collapsed ? item.label : ""} placement="right">
                  <NavItem
                    collapsed={collapsed}
                    onClick={() => {
                      const route = normalizeMenuPath(item.path);
                      if (route) {
                        handleMenuNavigate(route);
                        return;
                      }
                      if (hasMenuChildren(item.children)) {
                        if (collapsed) onToggleCollapse();
                        toggleSection(item.id);
                      }
                    }}
                    active={isActive}
                    itemColor={item.color}
                  >
                    <ListItemIcon>
                      <img src={item.icon} alt={item.label} />
                    </ListItemIcon>
                    {!collapsed && (
                      <>
                        <ListItemText
                          primary={item.label}
                          primaryTypographyProps={{ fontSize: "0.9rem", fontWeight: isActive ? 800 : 600 }}
                        />
                        {hasMenuChildren(item.children) && (
                          <ExpandMoreIcon
                            sx={{
                              fontSize: 18,
                              transition: "transform 0.3s ease",
                              transform: isSectionExpanded ? "rotate(0deg)" : "rotate(-90deg)",
                              color: alpha(colorTokens.sidebar.text.secondary, 0.4)
                            }}
                          />
                        )}
                      </>
                    )}
                  </NavItem>
                </Tooltip>

                {hasMenuChildren(item.children) && (
                  <Collapse in={isSectionExpanded && !collapsed} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                      {item.children!.map((child) => {
                        const isChildActive = location.pathname === child.path;
                        return (
                          <SubNavItem
                            key={child.id}
                            onClick={() => {
                              const route = normalizeMenuPath(child.path);
                              if (route) handleMenuNavigate(route);
                            }}
                            active={isChildActive}
                          >
                            <ListItemText
                              primary={child.label}
                              primaryTypographyProps={{
                                fontSize: "0.8rem",
                                fontWeight: isChildActive ? 700 : 500,
                              }}
                            />
                          </SubNavItem>
                        );
                      })}
                    </List>
                  </Collapse>
                )}
              </Box>
            );
          })}
        </List>
      </Box>

      <ProfileCard collapsed={collapsed}>
        <Avatar
          src={(user?.profile_image_path as string | undefined)}
          sx={{
            width: collapsed ? 44 : 46,
            height: collapsed ? 44 : 46,
            bgcolor: colorTokens.preschool.turquoise.main,
            border: `3px solid #ffffff`,
            boxShadow: `0 8px 20px ${alpha(colorTokens.preschool.turquoise.main, 0.15)}`,
            fontWeight: 900,
            fontSize: "1.1rem",
            color: "#ffffff"
          }}
        >
          {(user?.full_name || 'U').charAt(0).toUpperCase()}
        </Avatar>
        {!collapsed && (
          <Box sx={{ flex: 1, overflow: "hidden" }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 900,
                color: colorTokens.sidebar.text.primary,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                lineHeight: 1.1,
                fontSize: "0.85rem"
              }}
            >
              {user?.full_name || "Admin User"}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: colorTokens.sidebar.text.secondary,
                fontWeight: 700,
                display: "block",
                mt: 0.2,
                fontSize: "0.7rem",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}
            >
              {rbacRoles.length > 0 ? toRoleLabel(rbacRoles[0]) : (user?.role || "Staff")}
            </Typography>
          </Box>
        )}
      </ProfileCard>
    </SidebarContainer>
  );

  return (
    <Slide direction="right" in={mounted} mountOnEnter unmountOnExit>
      <Box
        component="nav"
        sx={{
          width: { md: collapsed ? COLLAPSED_DRAWER_WIDTH : DRAWER_WIDTH },
          flexShrink: { md: 0 },
          transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
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
              border: "none",
              bgcolor: "transparent",
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
              border: "none",
              transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
              overflowX: "hidden",
              bgcolor: "transparent",
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
