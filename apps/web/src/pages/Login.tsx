/**
 * Login Page
 * User authentication page with unified design and RBAC integration
 */

import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Link as MuiLink,
  InputAdornment,
  IconButton,
  Grid,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Zoom,
  Fade,
} from "@mui/material";
import {
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  Login as LoginIcon,
  AccountCircle,
  Dashboard as DashboardIcon,
  Storage as StorageIcon,
  Security as SecurityIcon,
  People as PeopleIcon,
  ArrowForward as ArrowForwardIcon,
} from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";
import { useRBAC } from "../context/RBACContext";
import { LoginRequest } from "../types/auth";


export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithContext, isAuthenticated, isLoading: authLoading } = useAuth();
  const { setRBACData } = useRBAC();

  const [formData, setFormData] = useState<LoginRequest>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
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

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = "Please enter Email Address.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid Email Address.";
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Please enter Password.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field errors as user types
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validate()) return;

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
      // Generic error handling as per user story
      const message = err?.message || err?.detail || "";
      if (message.toLowerCase().includes("inactive")) {
        setError("Your account is inactive. Please contact system administrator.");
      } else {
        setError("Invalid credentials.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Button disabled until both fields filled
  const isButtonDisabled = !formData.email.trim() || !formData.password || isSubmitting;

  // Don't render login form if already authenticated (while redirecting)
  if (isAuthenticated) return null;

  const actionItems = [
    {
      icon: <DashboardIcon sx={{ color: "#ffffff" }} />,
      title: "Platform Dashboard",
      desc: "Monitor tenant health and system performance."
    },
    {
      icon: <StorageIcon sx={{ color: "#ffffff" }} />,
      title: "Resource Orchestration",
      desc: "Manage intelligent cloud resource allocation."
    },
    {
      icon: <SecurityIcon sx={{ color: "#ffffff" }} />,
      title: "Security & Compliance",
      desc: "Review logs and manage encryption protocols."
    },
    {
      icon: <PeopleIcon sx={{ color: "#ffffff" }} />,
      title: "Identity & RBAC",
      desc: "Configure cross-tenant roles and permissions."
    }
  ];

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: "#ffffff" }}>
      <Grid container>
        {/* Left Side: Login Form */}
        <Grid
          item
          xs={12}
          md={6}
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            p: { xs: 4, md: 8, lg: 12 },
          }}
        >
          <Box sx={{ maxWidth: 440, width: "100%" }}>
            {/* Logo/Brand Section */}
            <Box sx={{ mb: 4 }}>
              <Box
                component="img"
                src="/aadi-logo.png"
                alt="Aadi Logo"
                sx={{ width: 120, height: "auto", mb: 2 }}
              />
              <Typography variant="subtitle2" sx={{ color: "#64748b", fontWeight: 700, mb: 1, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Login Platform
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5, letterSpacing: "-0.02em" }}>
                Welcome back
              </Typography>
              <Typography variant="body1" sx={{ color: "#64748b" }}>
                Please enter your credentials to access the core platform.
              </Typography>
            </Box>

            {error && (
              <Fade in>
                <Alert
                  severity="error"
                  variant="outlined"
                  sx={{
                    mb: 4,
                    borderRadius: 1,
                    borderColor: "#ef4444",
                    backgroundColor: "rgba(239, 68, 68, 0.02)",
                    color: "#b91c1c"
                  }}
                >
                  {error}
                </Alert>
              </Fade>
            )}

            <Box component="form" onSubmit={handleSubmit} noValidate sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: "#1e293b", mb: 1 }}>
                  Email Address *
                </Typography>
                <TextField
                  name="email"
                  placeholder="Enter Your Email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  error={!!errors.email}
                  helperText={errors.email}
                  fullWidth
                  autoComplete="email"
                  autoFocus
                  InputProps={{
                    sx: {
                      borderRadius: 1,
                      backgroundColor: "#fff",
                      height: "50px",
                      border: "1px solid #e2e8f0",
                      "& fieldset": { border: "none" },
                      "&.Mui-focused": { border: "1px solid #14b8a6", boxShadow: "0 0 0 4px rgba(20, 184, 166, 0.1)" },
                    }
                  }}
                />
              </Box>

              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: "#1e293b", mb: 1 }}>
                  Password *
                </Typography>
                <TextField
                  name="password"
                  placeholder="Enter Your Password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  error={!!errors.password}
                  helperText={errors.password}
                  fullWidth
                  autoComplete="current-password"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={togglePasswordVisibility}
                          edge="end"
                          size="small"
                        >
                          {showPassword ? <VisibilityOff sx={{ fontSize: "1.1rem" }} /> : <Visibility sx={{ fontSize: "1.1rem" }} />}
                        </IconButton>
                      </InputAdornment>
                    ),
                    sx: {
                      borderRadius: 1,
                      backgroundColor: "#fff",
                      height: "50px",
                      border: "1px solid #e2e8f0",
                      "& fieldset": { border: "none" },
                      "&.Mui-focused": { border: "1px solid #14b8a6", boxShadow: "0 0 0 4px rgba(20, 184, 166, 0.1)" },
                    }
                  }}
                />
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <FormControlLabel
                  control={<Checkbox size="small" sx={{ color: "#cbd5e1", "&.Mui-checked": { color: "#14b8a6" } }} />}
                  label={<Typography variant="body2" sx={{ color: "#64748b" }}>Remember me</Typography>}
                />
                <MuiLink
                  component={Link}
                  to="/forgot-password"
                  sx={{
                    color: "#1e293b",
                    textDecoration: "none",
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    "&:hover": { color: "#14b8a6" }
                  }}
                >
                  Forgot password?
                </MuiLink>
              </Box>

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={isButtonDisabled}
                sx={{
                  mt: 0.5,
                  height: "56px",
                  borderRadius: 1.5,
                  backgroundColor: "#0f172a",
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "1rem",
                  "&:hover": {
                    backgroundColor: "#1e293b",
                  },
                  "&.Mui-disabled": {
                    backgroundColor: "#f1f5f9",
                    color: "#94a3b8"
                  }
                }}
              >
                {isSubmitting ? <CircularProgress size={24} sx={{ color: "#ffffff" }} /> : "Log In"}
              </Button>

              <Box sx={{ mt: 1, textAlign: "center" }}>
                <Typography variant="body2" sx={{ color: "#64748b" }}>
                  Don't have an account?{" "}
                  <MuiLink
                    component={Link}
                    to="/register"
                    sx={{
                      color: "#14b8a6",
                      textDecoration: "none",
                      fontWeight: 700,
                      "&:hover": { textDecoration: "underline" }
                    }}
                  >
                    Register
                  </MuiLink>
                </Typography>
              </Box>
            </Box>
          </Box>
        </Grid>

        {/* Right Side: Informational Action Panel */}
        <Grid
          item
          xs={false}
          md={6}
          sx={{
            position: "relative",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundImage: "url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')", // Futuristic network connection image
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            p: 8,
            overflow: "hidden",
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(15, 23, 42, 0.4)", // Dark tint overlay
              backdropFilter: "blur(20px)", // Reference image style blur
              zIndex: 1,
            }
          }}
        >
          <Box sx={{ position: "relative", zIndex: 2, maxWidth: 500, mx: "auto" }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {actionItems.map((item, index) => (
                <Box
                  key={index}
                  sx={{
                    py: 4.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottom: index !== actionItems.length - 1 ? "1px solid rgba(255, 255, 255, 0.1)" : "none",
                    cursor: "pointer",
                    transition: "all 0.3s",
                    "&:hover": {
                      transform: "translateX(8px)",
                      "& .arrow-icon": { transform: "translateX(4px)" }
                    }
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Box
                      sx={{
                        width: 52,
                        height: 52,
                        borderRadius: 1.5,
                        backgroundColor: "rgba(255, 255, 255, 0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      {item.icon}
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ color: "#ffffff", fontWeight: 700, mb: 0.5, letterSpacing: "-0.01em" }}>
                        {item.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.6)", lineHeight: 1.5 }}>
                        {item.desc}
                      </Typography>
                    </Box>
                  </Box>
                  <ArrowForwardIcon
                    className="arrow-icon"
                    sx={{ color: "rgba(255, 255, 255, 0.3)", transition: "all 0.3s" }}
                  />
                </Box>
              ))}
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
