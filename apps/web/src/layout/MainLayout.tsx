/**
 * MainLayout Component
 * Main application layout with navigation and responsive design
 */

import { AppBar, Toolbar, Typography, Box, Container, IconButton, useMediaQuery, useTheme, Menu, MenuItem, Avatar, Chip } from "@mui/material";
import { Menu as MenuIcon, Logout as LogoutIcon } from "@mui/icons-material";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { useState, useCallback, memo } from "react";
import { appName } from "../config";
import { Container as PageContainer } from "../components/common";
import { useAuth } from "../context/AuthContext";
import { useRBAC } from "../context/RBACContext";
import Sidebar from "../components/layout/Sidebar";

function MainLayout() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const { clearRBACData } = useRBAC();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);

  const handleUserMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  }, []);

  const handleUserMenuClose = useCallback(() => {
    setUserMenuAnchor(null);
  }, []);

  const handleLogout = useCallback(() => {
    handleUserMenuClose();
    clearRBACData();
    logout();
    navigate("/login");
  }, [handleUserMenuClose, clearRBACData, logout, navigate]);

  const handleMobileMenuToggle = useCallback(() => {
    setMobileMenuOpen(!mobileMenuOpen);
  }, [mobileMenuOpen]);

  const handleMobileMenuClose = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={handleMobileMenuClose} />

      {/* Main content area */}
      <Box sx={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
        <AppBar position="sticky" elevation={1} sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
          <Toolbar>
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
                  label={user.role === "admin" ? "Admin" : "User"}
                  size="small"
                  color={user.role === "admin" ? "secondary" : "default"}
                  sx={{ display: { xs: "none", sm: "flex" } }}
                />
                <IconButton
                  onClick={handleUserMenuOpen}
                  size="small"
                  sx={{ ml: 1 }}
                  aria-label="account menu"
                >
                  <Avatar sx={{ width: 32, height: 32, bgcolor: "secondary.main" }}>
                    {user.full_name.charAt(0).toUpperCase()}
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
                        {user.full_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {user.email}
                      </Typography>
                    </Box>
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

      <Box component="main" sx={{ flexGrow: 1, py: { xs: 2, md: 4 } }}>
        <PageContainer>
        <Outlet />
        </PageContainer>
      </Box>

        <Box
          component="footer"
          sx={{
            py: 3,
            px: 2,
            mt: "auto",
            backgroundColor: (theme) =>
              theme.palette.mode === "light" ? theme.palette.grey[100] : theme.palette.grey[900],
            borderTop: (theme) => `1px solid ${theme.palette.divider}`,
          }}
        >
          <Container maxWidth="lg">
            <Typography variant="body2" color="text.secondary" align="center">
              © {new Date().getFullYear()} {appName}. All rights reserved.
            </Typography>
          </Container>
        </Box>
      </Box>
    </Box>
  );
}

// Memoize layout to prevent unnecessary re-renders
export default memo(MainLayout);