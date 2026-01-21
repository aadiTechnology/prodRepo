/**
 * MainLayout Component
 * Main application layout with navigation and responsive design
 */

import { AppBar, Toolbar, Typography, Button, Box, Container, IconButton, useMediaQuery, useTheme, Menu, MenuItem, Avatar, Chip } from "@mui/material";
import { Menu as MenuIcon, Logout as LogoutIcon, AccountCircle } from "@mui/icons-material";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { appName } from "../config";
import { Container as PageContainer } from "../components/common";
import { useAuth } from "../context/AuthContext";

interface NavLink {
  label: string;
  path: string;
}

const navLinks: NavLink[] = [
  { label: "Home", path: "/" },
  { label: "About", path: "/about" },
  { label: "Users", path: "/users" },
];

export default function MainLayout() {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);

  const isActive = (path: string) => location.pathname === path;

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = () => {
    handleUserMenuClose();
    logout();
    navigate("/login");
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <AppBar position="sticky" elevation={1}>
        <Toolbar>
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

          {isMobile ? (
            <>
              <IconButton
                color="inherit"
                edge="end"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="menu"
              >
                <MenuIcon />
              </IconButton>
            </>
          ) : (
            <Box sx={{ display: "flex", gap: 1, flexGrow: 1 }}>
              {navLinks.map((link) => (
                <Button
                  key={link.path}
                  color="inherit"
                  component={Link}
                  to={link.path}
                  variant={isActive(link.path) ? "outlined" : "text"}
                  sx={{
                    borderColor: isActive(link.path) ? "rgba(255, 255, 255, 0.5)" : "transparent",
                  }}
                >
                  {link.label}
                </Button>
              ))}
            </Box>
          )}

          {/* User menu */}
          {isAuthenticated && user && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: 2 }}>
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

        {isMobile && mobileMenuOpen && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              pb: 2,
              px: 2,
              gap: 1,
            }}
          >
            {navLinks.map((link) => (
              <Button
                key={link.path}
                color="inherit"
                component={Link}
                to={link.path}
                fullWidth
                variant={isActive(link.path) ? "outlined" : "text"}
                onClick={() => setMobileMenuOpen(false)}
                sx={{
                  justifyContent: "flex-start",
                  borderColor: isActive(link.path) ? "rgba(255, 255, 255, 0.5)" : "transparent",
                }}
              >
                {link.label}
              </Button>
            ))}
            {isAuthenticated && user && (
              <>
                <Box sx={{ borderTop: "1px solid rgba(255, 255, 255, 0.2)", my: 1, pt: 1 }}>
                  <Typography variant="caption" sx={{ px: 2, display: "block", mb: 1 }}>
                    {user.full_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ px: 2, display: "block", mb: 1 }}>
                    {user.email}
                  </Typography>
                  <Chip
                    label={user.role === "admin" ? "Admin" : "User"}
                    size="small"
                    color={user.role === "admin" ? "secondary" : "default"}
                    sx={{ ml: 2, mb: 1 }}
                  />
                </Box>
                <Button
                  color="inherit"
                  fullWidth
                  startIcon={<LogoutIcon />}
                  onClick={handleLogout}
                  sx={{ justifyContent: "flex-start" }}
                >
                  Logout
                </Button>
              </>
            )}
          </Box>
        )}
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
  );
}