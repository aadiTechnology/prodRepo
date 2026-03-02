/**
 * MainLayout Component
 * Main application layout with navigation and responsive design
 */

import { AppBar, Toolbar, Typography, Box, Container, IconButton, useMediaQuery, useTheme, Menu, MenuItem, Avatar, Chip } from "@mui/material";
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
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(8px)',
            color: 'text.primary',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Toolbar variant="dense" sx={{ minHeight: 44 }}>
            {isMobile && (
              <IconButton
                color="inherit"
                edge="start"
                onClick={handleMobileMenuToggle}
                aria-label="menu"
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
            )}

            <Typography
              variant="h6"
              component={Link}
              to="/"
              sx={{
                flexGrow: { xs: 1, md: 0 },
                textDecoration: "none",
                color: "inherit",
                fontWeight: 600,
                mr: { md: 4 },
              }}
            >
              {appName}
            </Typography>

            <Box sx={{ flexGrow: 1 }} />

            {/* User menu */}
            {isAuthenticated && user && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Chip
                  label={
                    user.role === "SUPER_ADMIN"
                      ? "System Admin"
                      : user.role === "admin"
                        ? "Admin"
                        : "User"
                  }
                  size="small"
                  color={
                    user.role === "SUPER_ADMIN" || user.role === "admin"
                      ? "secondary"
                      : "default"
                  }
                  sx={{ display: { xs: "none", sm: "flex" } }}
                />
                <IconButton
                  onClick={handleUserMenuOpen}
                  size="small"
                  sx={{ ml: 1 }}
                  aria-label="account menu"
                >
                  <Avatar
                    src={avatarSrc || ''}
                    sx={{ width: 32, height: 32, bgcolor: "secondary.main" }}
                  >
                    {!avatarSrc && (user.full_name || 'U').charAt(0).toUpperCase()}
                  </Avatar>
                </IconButton>
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
                >
                  <MenuItem disabled>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {/* SECURITY: Sanitize user display name to prevent XSS */}
                        {(user.full_name || '').substring(0, 100).replace(/[<>'\"]/g, '')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {/* SECURITY: Sanitize email to prevent XSS */}
                        {(user.email || '').substring(0, 150).replace(/[<>'\"]/g, '')}
                      </Typography>
                    </Box>
                  </MenuItem>
                  {location.pathname !== "/profile" && (
                    <MenuItem onClick={handleProfileClick}>
                      <PersonIcon sx={{ mr: 1, fontSize: 20 }} />
                      My Profile
                    </MenuItem>
                  )}
                  <MenuItem onClick={handleChangePasswordClick}>
                    <LockIcon sx={{ mr: 1, fontSize: 20 }} />
                    Change Password
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>
                    <LogoutIcon sx={{ mr: 1, fontSize: 20 }} />
                    Logout
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
