/**
 * MainLayout Component
 * Main application layout with navigation and responsive design
 */

import { AppBar, Toolbar, Typography, Box, Container, IconButton, useMediaQuery, useTheme, Menu, MenuItem, Avatar, Chip, ListItemIcon, Divider, Button, Tooltip, alpha } from "@mui/material";
import { Menu as MenuIcon, Logout as LogoutIcon, Person as PersonIcon, Lock as LockIcon, ArrowBack as ArrowBackIcon, Home as HomeIcon } from "@mui/icons-material";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useCallback, memo, useEffect } from "react";
import { appName } from "../config";
import { Container as PageContainer } from "../components/common";
import { useAuth } from "../context/AuthContext";
import { useRBAC } from "../context/RBACContext";
import Sidebar from "../components/layout/Sidebar";
import AIAssistant from "../components/AIAssistant";
import profileService from "../api/services/profileService";
import { apiBaseUrl } from "../config";
import { colorTokens } from "../tokens/colors";
import { toRoleLabel } from "../utils/formatters";
import { getTimeGreeting, getFirstName } from "../utils/greeting";

function MainLayout() {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAuthenticated, exitImpersonation, refreshUser } = useAuth();
  const { roles: rbacRoles, clearRBACData } = useRBAC();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [avatarSrc, setAvatarSrc] = useState<string | undefined>(undefined);
  const [logoError, setLogoError] = useState(false);
  const [avatarKey, setAvatarKey] = useState(0); // Force avatar re-render on image change

  // Reset logo error when tenant changes
  useEffect(() => {
    setLogoError(false);
  }, [user?.tenant?.id, user?.tenant?.logo_url]);

  /** SECURITY: Convert stored path like "/profile-images/7.jpg" → full URL with validation */
  const toFullUrl = (path: string | null | undefined): string | undefined => {
    if (!path || typeof path !== 'string') return undefined;

    // SECURITY: Reject absolute URLs that don't match our domain
    if (path.startsWith("http")) {
      try {
        const url = new URL(path);
        const baseUrl = new URL(apiBaseUrl);
        // Only allow URLs from the same origin
        if (url.origin !== baseUrl.origin) {
          return undefined;
        }
        return path;
      } catch {
        return undefined; // Invalid URL
      }
    }

    // SECURITY: Only allow paths starting with /
    if (!path.startsWith("/")) return undefined;

    // SECURITY: Block path traversal attempts
    if (path.includes("..") || path.includes("//")) return undefined;

    const root = apiBaseUrl.replace(/\/api\/?$/, "").replace(/\/$/, "");
    return `${root}${path}`;
  };

  /** Fetch profile image and update avatar */
  const refreshAvatar = useCallback(async () => {
    try {
      const data = await profileService.getProfile();
      // SECURITY: Validate image path before setting
      if (data && typeof data.profile_image_path === 'string') {
        const validatedUrl = toFullUrl(data.profile_image_path);
        setAvatarSrc(validatedUrl);
        setAvatarKey(prev => prev + 1); // Force re-render to bypass browser cache
      }
    } catch (error) {
      // SECURITY: Log error for debugging but don't expose to UI
      console.error('Failed to fetch profile image');
      // avatar will fall back to initials
    }
  }, []);

  // Fetch on mount or when user changes
  useEffect(() => {
    if (isAuthenticated) {
      if (user?.profile_image_path) {
        setAvatarSrc(toFullUrl(user.profile_image_path));
      } else {
        refreshAvatar();
      }
    }
  }, [isAuthenticated, user?.id, user?.profile_image_path, refreshAvatar]);

  // Listen for profile-image-updated event fired by ProfilePage after upload
  useEffect(() => {
    const handler = () => refreshAvatar();
    window.addEventListener("profile-image-updated", handler);
    return () => window.removeEventListener("profile-image-updated", handler);
  }, [refreshAvatar]);

  // Listen for profile-updated event (name change, etc.) and refresh full user data
  useEffect(() => {
    const handler = () => {
      if (refreshUser) {
        refreshUser();
      }
    };
    window.addEventListener("profile-updated", handler);
    return () => window.removeEventListener("profile-updated", handler);
  }, [refreshUser]);

  const handleUserMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  }, []);

  const handleUserMenuClose = useCallback(() => {
    setUserMenuAnchor(null);
  }, []);

  // Close menu on navigation to prevent drifting dropdowns
  useEffect(() => {
    handleUserMenuClose();
  }, [location.pathname, handleUserMenuClose]);

  const handleProfileClick = useCallback(() => {
    handleUserMenuClose();
    navigate("/profile");
  }, [handleUserMenuClose, navigate]);

  const handleChangePasswordClick = useCallback(() => {
    handleUserMenuClose();
    navigate("/change-password");
  }, [handleUserMenuClose, navigate]);

  const handleLogout = useCallback(() => {
    handleUserMenuClose();
    clearRBACData();
    void logout();
  }, [handleUserMenuClose, clearRBACData, logout]);

  const handleMobileMenuToggle = useCallback(() => {
    setMobileMenuOpen(!mobileMenuOpen);
  }, [mobileMenuOpen]);

  const handleSidebarCollapseToggle = useCallback(() => {
    setSidebarCollapsed(!sidebarCollapsed);
  }, [sidebarCollapsed]);

  const handleMobileMenuClose = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  const DRAWER_WIDTH = 280;
  const COLLAPSED_DRAWER_WIDTH = 80;
  const headerGreeting = getTimeGreeting(new Date().getHours());
  const headerFirstName = getFirstName(user?.full_name || "User");

  return (
    <Box sx={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Sidebar */}
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={handleMobileMenuClose}
        collapsed={sidebarCollapsed}
        onToggleCollapse={handleSidebarCollapseToggle}
      />

      {/* Main content area */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          minWidth: 0,
          height: "100%",
          width: {
            md: `calc(100% - ${sidebarCollapsed ? COLLAPSED_DRAWER_WIDTH : DRAWER_WIDTH}px)`
          },
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          background: `linear-gradient(135deg, ${colorTokens.background.default} 0%, ${colorTokens.background.muted} 100%)`,
        }}
      >
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            zIndex: (theme) => theme.zIndex.drawer + 1,
            backgroundColor: alpha(colorTokens.background.paper, 0.7),
            backdropFilter: 'blur(16px) saturate(180%)',
            WebkitBackdropFilter: 'blur(16px) saturate(180%)',
            color: colorTokens.text.primary,
            borderBottom: '1px solid',
            borderColor: colorTokens.border.subtle,
            transition: theme.transitions.create(['width', 'margin', 'background-color'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          }}
        >
          <Toolbar
            sx={{
              minHeight: { xs: 56, sm: 60, md: 68 },
              px: { xs: 1.5, sm: 2, md: 3 },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
            }}
          >
            {/* Column 1: Left - Logo & Branding */}
            <Box
              sx={{
                flex: { xs: '0 1 auto', md: 1 },
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                zIndex: 2,
              }}
            >
              {isMobile && (
                <IconButton
                  color="inherit"
                  edge="start"
                  onClick={handleMobileMenuToggle}
                  aria-label="menu"
                  sx={{ mr: 1, "&:hover": { backgroundColor: "rgba(0,0,0,0.04)" } }}
                >
                  <MenuIcon />
                </IconButton>
              )}

              <Box
                component={Link}
                to="/"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  textDecoration: "none",
                  gap: 1.5,
                }}
              >
                <Box
                  component="img"
                  src={user?.tenant?.logo_url && !logoError ? user.tenant.logo_url : "/aaadi.webp"}
                  alt="Logo"
                  sx={{ height: "45px", objectFit: "contain", borderRadius: "8px" }}
                  onError={() => setLogoError(true)}
                />
                {!user?.tenant && (
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      color: "text.primary",
                      fontSize: isMobile ? "1rem" : "1.25rem",
                      display: { xs: "none", sm: "block" }
                    }}
                  >
                    Aadi Technology
                  </Typography>
                )}
              </Box>

              {/* Back to System View (Home icon) when impersonating - Now on the left side */}
              {user?.is_impersonation && (
                <Tooltip title="Back to Tenant List">
                  <IconButton
                    onClick={exitImpersonation}
                    sx={{
                      color: 'primary.main',
                      backgroundColor: 'rgba(99, 102, 241, 0.08)',
                      ml: 1,
                      '&:hover': {
                        backgroundColor: 'rgba(99, 102, 241, 0.15)',
                      }
                    }}
                  >
                    <HomeIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Box>

            {/* Right — greeting + user profile */}
            <Box
              sx={{
                flex: { xs: 1, md: "0 1 auto" },
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: { xs: 1, sm: 1.5, md: 2 },
                zIndex: 2,
                minWidth: 0,
              }}
            >
              {isAuthenticated && user && (
                <Typography
                  component="div"
                  sx={{
                    fontWeight: 800,
                    letterSpacing: "-0.02em",
                    color: colorTokens.text.primary,
                    textAlign: "right",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: { xs: 140, sm: 260, md: 320, lg: 420 },
                    fontSize: { xs: "0.82rem", sm: "0.92rem", md: "1rem", lg: "1.05rem" },
                    lineHeight: 1.25,
                  }}
                >
                  {headerGreeting.text},{" "}
                  <Box component="span" sx={{ color: colorTokens.primary.main, fontWeight: 800 }}>
                    {headerFirstName}
                  </Box>{" "}
                  <Box
                    component="span"
                    sx={{
                      display: "inline-block",
                      fontSize: { xs: "0.9rem", sm: "1rem", md: "1.05rem" },
                      animation: "headerWaveHand 2.5s ease-in-out infinite",
                      transformOrigin: "70% 70%",
                    }}
                  >
                    👋
                  </Box>
                </Typography>
              )}

              {/* User menu */}
              {isAuthenticated && user && (
                <Box
                  onClick={handleUserMenuOpen}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: { xs: 0.75, sm: 1.5 },
                    cursor: "pointer",
                    padding: { xs: "4px 6px", sm: "6px 12px" },
                    borderRadius: "14px",
                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    border: "1px solid transparent",
                    "&:hover": {
                      backgroundColor: "rgba(255, 255, 255, 0.8)",
                      borderColor: "rgba(0, 0, 0, 0.04)",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.04)"
                    }
                  }}
                >
                  <Box sx={{ display: { xs: "none", lg: "flex" }, flexDirection: "column", alignItems: "flex-end" }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary", lineHeight: 1.1 }}>
                      {user.full_name || 'User'}
                    </Typography>
                    <Box
                      sx={{
                        fontSize: "0.65rem",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        color: rbacRoles.includes("super_admin") ? "#6366f1" : "text.secondary",
                        backgroundColor: rbacRoles.includes("super_admin") ? "rgba(99, 102, 241, 0.08)" : "rgba(0, 0, 0, 0.04)",
                        px: 0.8,
                        py: 0.2,
                        borderRadius: "4px",
                        mt: 0.3,
                        display: "inline-block"
                      }}
                    >
                      {rbacRoles.length > 0 ? toRoleLabel(rbacRoles[0]) : (user.role === "SUPER_ADMIN" ? "System Admin" : user.role || "User")}
                    </Box>
                  </Box>
                  <Avatar
                    key={avatarKey}
                    src={avatarSrc || ''}
                    sx={{
                      width: { xs: 36, sm: 42 },
                      height: { xs: 36, sm: 42 },
                      bgcolor: "primary.main",
                      boxShadow: "0 4px 12px rgba(99, 102, 241, 0.2)",
                      border: "2px solid white",
                      transition: "transform 0.2s",
                      fontSize: { xs: "0.85rem", sm: "1rem" },
                      "&:hover": { transform: "scale(1.05)" }
                    }}
                  >
                    {!avatarSrc && (user.full_name || 'U').charAt(0).toUpperCase()}
                  </Avatar>
                </Box>
              )}

              {/* Profile Menu */}
              <Menu
                anchorEl={userMenuAnchor}
                open={Boolean(userMenuAnchor)}
                onClose={handleUserMenuClose}
                anchorOrigin={{
                  vertical: "bottom",
                  horizontal: "right",
                }}
                transformOrigin={{
                  vertical: "top",
                  horizontal: "right",
                }}
                PaperProps={{
                  elevation: 0,
                  sx: {
                    mt: 2,
                    width: 260,
                    overflow: 'visible',
                    filter: 'drop-shadow(0px 12px 32px rgba(0,0,0,0.1))',
                    borderRadius: "20px",
                    border: '1px solid rgba(0,0,0,0.06)',
                    padding: "8px",
                    '&:before': {
                      content: '""',
                      display: 'block',
                      position: 'absolute',
                      top: 0,
                      right: 20,
                      width: 12,
                      height: 12,
                      bgcolor: 'background.paper',
                      transform: 'translateY(-50%) rotate(45deg)',
                      zIndex: 0,
                    },
                  },
                }}
              >
                <Box sx={{ px: 2, py: 2, mb: 1, borderRadius: "14px", background: "rgba(0,0,0,0.02)" }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "text.primary" }}>
                    {user?.full_name?.substring(0, 100).replace(/[<>'\"]/g, '') || 'User'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5 }}>
                    {user?.email?.substring(0, 150).replace(/[<>'\"]/g, '') || ''}
                  </Typography>
                </Box>

                <MenuItem onClick={handleProfileClick} sx={{ py: 1.5, borderRadius: "12px", gap: 1.5 }}>
                  <ListItemIcon sx={{ minWidth: "auto !important" }}>
                    <PersonIcon fontSize="small" sx={{ color: "text.secondary" }} />
                  </ListItemIcon>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Account Profile</Typography>
                </MenuItem>

                <MenuItem onClick={handleChangePasswordClick} sx={{ py: 1.5, borderRadius: "12px", gap: 1.5 }}>
                  <ListItemIcon sx={{ minWidth: "auto !important" }}>
                    <LockIcon fontSize="small" sx={{ color: "text.secondary" }} />
                  </ListItemIcon>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Security Settings</Typography>
                </MenuItem>

                <Divider sx={{ my: 1, opacity: 0.5 }} />

                <MenuItem onClick={handleLogout} sx={{ py: 1.5, borderRadius: "12px", gap: 1.5, color: "error.main", "&:hover": { bgcolor: "error.lighter" } }}>
                  <ListItemIcon sx={{ minWidth: "auto !important" }}>
                    <LogoutIcon fontSize="small" sx={{ color: "error.main" }} />
                  </ListItemIcon>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>Logout Session</Typography>
                </MenuItem>
              </Menu>
            </Box>
          </Toolbar>
        </AppBar>

        <Box
          component="main"
          sx={{
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            minWidth: 0,
            overflow: "auto",
            minHeight: 0, // CRITICAL: ensures flex child doesn't overflow parent incorrectly
            WebkitOverflowScrolling: "touch",
          }}
        >
          <PageContainer
            maxWidth={false}
            sx={{
              px: { xs: 1, sm: 2, md: 2, lg: 3, xl: 4 },
              py: { xs: 0.5, sm: 1 }, // Compact padding
              maxWidth: "100% !important",
              minWidth: 0,
              width: "100%",
            }}
          >
            <Outlet />
          </PageContainer>
        </Box>

        <Box
          component="footer"
          sx={{
            py: 1, // Reduced padding for a more compact footer
            px: 2,
            mt: "auto",
            backgroundColor: colorTokens.background.paper,
            borderTop: "1px solid",
            borderColor: colorTokens.border.subtle,
            position: "sticky",
            bottom: 0,
            zIndex: (theme) => theme.zIndex.drawer + 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: "50px"
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              component="img"
              src="/campus-axis-logo.png"
              alt="CampusAxis Logo"
              sx={{ height: "45px", objectFit: "contain" }}
            />
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
            © {new Date().getFullYear()} Campus Axis App. All rights reserved to Aadi Technology
          </Typography>
          <Box sx={{ width: "100px", display: { xs: "none", sm: "block" } }} />
        </Box>
      </Box>
      {isAuthenticated && <AIAssistant />}
      <style>{`
        @keyframes headerWaveHand {
          0%  { transform: rotate(0deg); }
          10% { transform: rotate(14deg); }
          20% { transform: rotate(-8deg); }
          30% { transform: rotate(14deg); }
          40% { transform: rotate(-4deg); }
          50% { transform: rotate(10deg); }
          60% { transform: rotate(0deg); }
          100%{ transform: rotate(0deg); }
        }
      `}</style>
    </Box>
  );
}

// Memoize layout to prevent unnecessary re-renders
export default memo(MainLayout);
