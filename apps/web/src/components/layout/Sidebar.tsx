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
import { colorTokens } from "../../tokens/colors";

// Import Icons from assets
import userIcon from "../../assets/icons/user.png";
import teamworkIcon from "../../assets/icons/teamwork.png";
import workingIcon from "../../assets/icons/working.png";
import schoolIcon from "../../assets/icons/school.png";
import assetsIcon from "../../assets/icons/assets.png";
import moneyIcon from "../../assets/icons/money.png";
import feesIcon from "../../assets/icons/fees.png";

const DRAWER_WIDTH = 280;
const COLLAPSED_DRAWER_WIDTH = 88;

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
  margin: "4px 16px",
  padding: collapsed ? "12px" : "12px 16px",
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

export default function Sidebar({ mobileOpen, onMobileClose, collapsed, onToggleCollapse }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const menuItems: MenuItemData[] = useMemo(() => {
    const rawRole = user?.role || "";
    const role = rawRole.toUpperCase();
    
    // Role Definitions
    const isSuperAdmin = role === "SUPER_ADMIN" || role === "SYSTEM_ADMIN";
    const isTenantAdmin = ["TENANT_ADMIN", "ADMIN"].includes(role);

    if (isSuperAdmin) {
      return [
        { id: "dashboard", label: "Dashboard", icon: workingIcon, path: "/", color: colorTokens.menuColors.dashboard },
        { 
          id: "tenants", 
          label: "Tenants", 
          icon: schoolIcon, 
          color: colorTokens.menuColors.students,
          children: [
            { id: "tenant-mgmt", label: "Tenant Management", path: "/tenants" },
          ]
        },
        { 
          id: "users", 
          label: "Users", 
          icon: userIcon, 
          color: colorTokens.menuColors.academics,
          children: [
            { id: "user-mgmt", label: "User Management", path: "/users" },
          ]
        },
        {
          id: "config",
          label: "System Config",
          icon: assetsIcon,
          color: colorTokens.menuColors.settings,
          children: [
            { id: "roles", label: "Role Management", path: "/roles" },
            { id: "theme", label: "Theme Studio", path: "/admin/theme-studio" },
            { id: "ai-review", label: "AI Review", path: "/ai/review" },
            { id: "ai-gen", label: "Story Generation", path: "/ai/generate" },
          ]
        }
      ];
    }

    if (isTenantAdmin) {
      return [
        { id: "dashboard", label: "Dashboard", icon: workingIcon, path: "/", color: colorTokens.menuColors.dashboard },
        { id: "students", label: "Students", icon: userIcon, path: "/students", color: colorTokens.menuColors.students },
        { id: "academics", label: "Academics", icon: schoolIcon, path: "/academics", color: colorTokens.menuColors.academics },
        {
          id: "fees",
          label: "Fees",
          icon: feesIcon,
          color: colorTokens.menuColors.fees,
          children: [
            { id: "fee-cat", label: "Fee Category", path: "/fees/categories" },
            { id: "fee-struct", label: "Fee Structure", path: "/fees/setup" },
            { id: "fee-discount", label: "Fee Discount", path: "/fees/discounts" },
            { id: "fee-assign", label: "Assign Fee to Class", path: "/fees" },
          ]
        },
        { id: "staff", label: "Staff", icon: teamworkIcon, path: "/staff", color: colorTokens.menuColors.staff },
        { id: "finance", label: "Finance", icon: moneyIcon, path: "/finance", color: colorTokens.menuColors.finance },
        { id: "settings", label: "Settings", icon: assetsIcon, path: "/settings", color: colorTokens.menuColors.settings },
      ];
    }

    // Default User Menu
    return [
      { id: "dashboard", label: "Dashboard", icon: workingIcon, path: "/", color: colorTokens.menuColors.dashboard },
      { id: "profile", label: "My Profile", icon: userIcon, path: "/profile", color: colorTokens.menuColors.students },
    ];
  }, [user?.role]);

  const toggleSection = (id: string, isActive: boolean) => {
    setExpandedSections((prev) => ({
      ...prev,
      [id]: prev[id] !== undefined ? !prev[id] : !isActive,
    }));
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
              <img src={schoolIcon} alt="Logo" style={{ width: "100%", height: "100%" }} />
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
            const isSectionExpanded = expandedSections[item.id] !== undefined ? expandedSections[item.id] : isActive;

            return (
              <Box key={item.id} sx={{ mb: 0.5 }}>
                <Tooltip title={collapsed ? item.label : ""} placement="right">
                  <NavItem
                    collapsed={collapsed}
                    onClick={() => {
                      if (item.children) {
                        if (collapsed) onToggleCollapse();
                        toggleSection(item.id, isActive);
                      } else if (item.path) {
                        navigate(item.path);
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
                        {item.children && (
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

                {item.children && (
                  <Collapse in={isSectionExpanded && !collapsed} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                      {item.children.map((child) => {
                        const isChildActive = location.pathname === child.path;
                        return (
                          <SubNavItem
                            key={child.id}
                            onClick={() => navigate(child.path)}
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
              {user?.role || "Staff"}
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
