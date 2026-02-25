/**
 * Login Page
 * User authentication page with unified design and RBAC integration
 */

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Link,
  InputAdornment,
  IconButton,
  Grid,
} from "@mui/material";
import {
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  Login as LoginIcon,
  AccountCircle,
} from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";
import { useRBAC } from "../context/RBACContext";
import { LoginRequest } from "../types/auth";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithContext, isAuthenticated, isLoading } = useAuth();
  const { setRBACData } = useRBAC();

  const [formData, setFormData] = useState<LoginRequest>({
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as { from?: Location })?.from?.pathname || "/";
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // 1. Authenticate & Get Context (RBAC data included in response)
      const response = await loginWithContext(formData);

      // 2. Set RBAC Data (Roles and Menus)
      setRBACData({
        roles: response.roles,
        menus: response.menus,
      });

      // 3. Navigation happens via useEffect or explicitly here
      const from = (location.state as { from?: Location })?.from?.pathname || "/";
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.message || err?.detail || "Invalid email or password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Don't render login form if already authenticated (while redirecting)
  if (isAuthenticated) {
    return null;
  }

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", overflow: "hidden" }}>
      <Grid container>
        {/* Left Panel: Branding and Logo */}
        <Grid
          item
          xs={false}
          sm={4}
          md={5}
          sx={{
            backgroundColor: "#0f172a", // Dark navy/slate background
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            position: "relative",
            "&::before": {
              content: '""',
              position: "absolute",
              bottom: "-50px",
              left: "-50px",
              width: "250px",
              height: "250px",
              backgroundColor: "rgba(255, 255, 255, 0.03)",
              borderRadius: "50%",
            }
          }}
        >
          <Box sx={{ textAlign: "center", zIndex: 1 }}>
            <Box
              component="img"
              src="/aadi-logo.png"
              alt="Aadi Technology Logo"
              sx={{ width: "120px", height: "auto", mb: 2, filter: "brightness(1.1)" }}
            />
           
            <Typography variant="h2" sx={{ fontWeight: 800, letterSpacing: "-0.02em" }}>
              Aadi Technology
            </Typography>
          </Box>
        </Grid>

        {/* Right Panel: Login Form */}
        <Grid
          item
          xs={12}
          sm={8}
          md={7}
          component={Paper}
          elevation={0}
          square
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f8fafc", // Light gray background
            p: 4,
          }}
        >
          <Box
            sx={{
              maxWidth: 450,
              width: "100%",
              p: 5,
              backgroundColor: "#ffffff",
              borderRadius: 3,
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
            }}
          >
            <Box sx={{ mb: 4, textAlign: "left" }}>
              <Typography variant="h4" sx={{ fontWeight: 800, color: "#1e293b", mb: 1 }}>
                Platform Admin Login
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sign in to manage tenants and system settings.
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, ml: 1, color: "#64748b", mb: 0.5, display: "block" }}>
                  Email Address
                </Typography>
                <TextField
                  name="email"
                  placeholder="sysadmin@server.com"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  fullWidth
                  autoComplete="email"
                  autoFocus
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon sx={{ color: "#94a3b8" }} />
                      </InputAdornment>
                    ),
                    sx: { borderRadius: 2, backgroundColor: "#eff6ff" }
                  }}
                />
              </Box>

              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, ml: 1, color: "#64748b", mb: 0.5, display: "block" }}>
                  Password
                </Typography>
                <TextField
                  name="password"
                  placeholder="••••••••"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  required
                  fullWidth
                  autoComplete="current-password"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon sx={{ color: "#94a3b8" }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={togglePasswordVisibility}
                          edge="end"
                          size="small"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                    sx: { borderRadius: 2, backgroundColor: "#eff6ff" }
                  }}
                />
                <Box sx={{ display: "flex", alignItems: "center", mt: 1, ml: 0.5 }}>
                  <Box
                    sx={{
                      width: 14,
                      height: 14,
                      backgroundColor: "#2196f3",
                      borderRadius: "2px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mr: 1
                    }}
                  >
                    <Typography sx={{ color: "#fff", fontSize: 10, fontWeight: 900 }}>i</Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Password is case-sensitive.
                  </Typography>
                </Box>
              </Box>

              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={isSubmitting || isLoading}
                startIcon={!isSubmitting && <LoginIcon />}
                sx={{
                  mt: 1,
                  py: 1.5,
                  borderRadius: 2,
                  backgroundColor: "#14a4b1", // Teal color from reference
                  boxShadow: "0 4px 6px -1px rgba(20, 164, 177, 0.4)",
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "1rem",
                  "&:hover": {
                    backgroundColor: "#118a95",
                  },
                }}
              >
                {isSubmitting ? "Signing In..." : "Sign In"}
              </Button>

              <Box sx={{ textAlign: "center", mt: 2 }}>
                <Typography variant="body2" sx={{ color: "#94a3b8", fontSize: "0.75rem", lineHeight: 1.6 }}>
                  This is a restricted access system. By signing in, you agree to the{" "}
                  <Link href="#" sx={{ color: "#14a4b1", fontWeight: 600, textDecoration: "none" }}>
                    Platform Security Policy
                  </Link>{" "}
                  and{" "}
                  <Link href="#" sx={{ color: "#14a4b1", fontWeight: 600, textDecoration: "none" }}>
                    Terms of Service
                  </Link>
                  . All activities are monitored and logged for security auditing purposes.
                </Typography>
                {/* 
                <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
                  Don't have an account?{" "}
                  <Link
                    component="button"
                    variant="body2"
                    onClick={() => navigate("/register")}
                    sx={{ fontWeight: 600, color: "#14a4b1", textDecoration: "none" }}
                  >
                    Sign Up
                  </Link>
                </Typography>
                */}
              </Box>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}

