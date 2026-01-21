/**
 * MainLayout Component
 * Main application layout with navigation and responsive design
 */

import { AppBar, Toolbar, Typography, Button, Box, Container, IconButton, useMediaQuery, useTheme } from "@mui/material";
import { Menu as MenuIcon } from "@mui/icons-material";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { appName } from "../config";
import { Container as PageContainer } from "../components/common";

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
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

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