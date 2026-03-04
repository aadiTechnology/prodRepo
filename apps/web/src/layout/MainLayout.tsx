/**
 * MainLayout Component
 * Main application layout with navigation and responsive design
 */

import { AppBar, Toolbar, Typography, Box, Container, IconButton, useMediaQuery, useTheme, Menu, MenuItem, Avatar, Chip, ListItemIcon, Divider } from "@mui/material";
import { Menu as MenuIcon, Logout as LogoutIcon, Person as PersonIcon, Lock as LockIcon } from "@mui/icons-material";
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

function MainLayout() {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const { clearRBACData } = useRBAC();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [avatarSrc, setAvatarSrc] = useState<string | undefined>(undefined);

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
      }
    } catch (error) {
      // SECURITY: Log error for debugging but don't expose to UI
      console.error('Failed to fetch profile image');
      // avatar will fall back to initials
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    if (isAuthenticated) refreshAvatar();
  }, [isAuthenticated, refreshAvatar]);

  // Listen for profile-image-updated event fired by ProfilePage after upload
  useEffect(() => {
    const handler = () => refreshAvatar();
    window.addEventListener("profile-image-updated", handler);
    return () => window.removeEventListener("profile-image-updated", handler);
  }, [refreshAvatar]);

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
    logout();
    navigate("/login");
  }, [handleUserMenuClose, clearRBACData, logout, navigate]);

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

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
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
          width: {
            md: `calc(100% - ${sidebarCollapsed ? COLLAPSED_DRAWER_WIDTH : DRAWER_WIDTH}px)`
          },
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            zIndex: (theme) => theme.zIndex.drawer + 1,
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(16px) saturate(180%)',
            WebkitBackdropFilter: 'blur(16px) saturate(180%)',
            color: 'text.primary',
            borderBottom: '1px solid',
            borderColor: 'rgba(0, 0, 0, 0.06)',
            transition: theme.transitions.create(['width', 'margin', 'background-color'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          }}
        >
          <Toolbar sx={{ minHeight: 68, px: { xs: 2, md: 3 } }}>
            {isMobile && (
              <IconButton
                color="inherit"
                edge="start"
                onClick={handleMobileMenuToggle}
                aria-label="menu"
                sx={{ mr: 2, "&:hover": { backgroundColor: "rgba(0,0,0,0.04)" } }}
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
                mr: { md: 4 }
              }}
            >
              <img
                src="/aaadi.webp"
                alt="Logo"
                style={{ height: "45px", objectFit: "contain", borderRadius: "8px" }}
              />
              {!isMobile && (
                <Typography
                  variant="h6"
                  sx={{
                    color: "text.primary",
                    fontWeight: 800,
                    fontSize: "1.25rem",
                    letterSpacing: "-0.5px"
                  }}
                >
                  {appName}
                </Typography>
              )}
            </Box>

            <Box sx={{ flexGrow: 1 }} />

            {/* User menu */}
            {isAuthenticated && user && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Chip
                  label={
                    user.role === "SUPER_ADMIN"
                      ? "System Admin"
                      : user.role === "admin"
                        ? "Admin"
                        : "User"
                  }
                  size="small"
                  sx={{
                    display: { xs: "none", sm: "flex" },
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    px: 0.5,
                    borderRadius: "6px",
                    backgroundColor: user.role === "SUPER_ADMIN" ? "rgba(99, 102, 241, 0.1)" : "rgba(0, 0, 0, 0.05)",
                    color: user.role === "SUPER_ADMIN" ? "#6366f1" : "text.secondary",
                    border: "none"
                  }}
                />

                <Box
                  onClick={handleUserMenuOpen}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    cursor: "pointer",
                    padding: "6px 12px",
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
                  <Box sx={{ display: { xs: "none", md: "block" }, textAlign: "right" }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary", lineHeight: 1.2 }}>
                      {user.full_name || 'User'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 500 }}>
                      {user.role === "SUPER_ADMIN" ? "System Admin" : user.role}
                    </Typography>
                  </Box>
                  <Avatar
                    src={avatarSrc || ''}
                    sx={{
                      width: 42,
                      height: 42,
                      bgcolor: "primary.main",
                      boxShadow: "0 4px 12px rgba(99, 102, 241, 0.2)",
                      border: "2px solid white",
                      transition: "transform 0.2s",
                      "&:hover": { transform: "scale(1.05)" }
                    }}
                  >
                    {!avatarSrc && (user.full_name || 'U').charAt(0).toUpperCase()}
                  </Avatar>
                </Box>

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
                      {(user.full_name || '').substring(0, 100).replace(/[<>'\"]/g, '')}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5 }}>
                      {(user.email || '').substring(0, 150).replace(/[<>'\"]/g, '')}
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
            )}
          </Toolbar>
        </AppBar>

        <Box component="main" sx={{ flexGrow: 1, py: 0, mb: "50px", overflow: "auto" }}>
          <PageContainer maxWidth={false} sx={{ px: { xs: 1, md: 1.5 } }}>
            <Outlet />
          </PageContainer>
        </Box>

        <Box
          component="footer"
          sx={{
            py: 1, // Reduced padding for a more compact footer
            px: 2,
            mt: "auto",
            backgroundColor: "white",
            borderTop: "1px solid",
            borderColor: "divider",
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
            <img
              src="/campus-axis-logo.png"
              alt="CampusAxis Logo"
              style={{ height: "45px", objectFit: "contain" }}
            />
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
            © {new Date().getFullYear()} Campus Axis App. All rights reserved to Aadi Technology
          </Typography>
          <Box sx={{ width: "100px", display: { xs: "none", sm: "block" } }} />
        </Box>
      </Box>
      {isAuthenticated && <AIAssistant />}
    </Box>
  );
}

// Memoize layout to prevent unnecessary re-renders
export default memo(MainLayout);
