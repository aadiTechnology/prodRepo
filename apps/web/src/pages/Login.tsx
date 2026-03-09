/**
 * Login Page
 * User authentication page with unified design and RBAC integration
 */

import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  Box,
  Paper,
  Typography,
  Alert,
  Link as MuiLink,
  Grid,
  Zoom,
  Fade,
} from "@mui/material";
import { TextField, Button, InputAdornment, IconButton, CircularProgress } from "../components/primitives";
import { EmailInput, PasswordInput } from "../components/semantic";
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
  Info as InfoIcon,
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
      let from = "/";
      const statePath = (location.state as { from?: Location })?.from?.pathname;
      if (statePath && statePath.startsWith("/") && !statePath.includes("http")) {
        from = statePath;
      }
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  // Clear sensitive data on unmount for security
  useEffect(() => {
    return () => {
      setFormData({ email: "", password: "" });
      setErrors({});
      setError(null);
    };
  }, []);

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    // Email validation - stricter pattern and length check
    if (!formData.email.trim()) {
      newErrors.email = "Please enter Email Address.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) || formData.email.length > 254) {
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
      // Validate redirect pathname to prevent open redirect attacks
      let from = "/";
      const statePath = (location.state as { from?: Location })?.from?.pathname;
      if (statePath && statePath.startsWith("/") && !statePath.includes("http")) {
        from = statePath;
      }
      navigate(from, { replace: true });
    } catch (err: any) {
      // Generic error handling - do NOT leak account status information (prevents account enumeration attacks)
      setError("Invalid credentials.");
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
                <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ mb: 1 }}>
                  Email Address <Box component="span" sx={{ color: "#ef4444" }}>*</Box>
                </Typography>
                <EmailInput
                  name="email"
                  placeholder="Enter Your Email"
                  value={formData.email}
                  onChange={handleChange}
                  error={!!errors.email}
                  helperText={errors.email}
                  fullWidth
                  autoComplete="email"
                  autoFocus
                  inputProps={{
                    style: { 
                      padding: "12px 16px",
                    }
                  }}
                  InputProps={{
                    sx: {
                      borderRadius: "8px",
                      backgroundColor: "#ffffff",
                      height: "50px",
                      transition: "all 0.2s",
                      border: "1px solid #cbd5e1",
                      boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                      "& fieldset": { border: "none" },
                      "&:hover": {
                        borderColor: "#94a3b8",
                      },
                      "&.Mui-focused": { 
                        borderColor: "#14b8a6", 
                        boxShadow: "0 0 0 4px rgba(20, 184, 166, 0.1)",
                      },
                      "& input": { 
                        color: "#0f172a",
                        fontSize: "0.95rem",
                      },
                      "& input:-webkit-autofill, & input:-webkit-autofill:hover, & input:-webkit-autofill:focus": {
                        WebkitBoxShadow: "0 0 0 1000px #ffffff inset !important",
                        WebkitTextFillColor: "#0f172a !important",
                        transition: "background-color 5000s ease-in-out 0s",
                      },
                    }
                  }}
                />
              </Box>

              <Box>
                <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ mb: 1 }}>
                  Password <Box component="span" sx={{ color: "#ef4444" }}>*</Box>
                </Typography>
                <PasswordInput
                  name="password"
                  placeholder="Enter Your Password"
                  value={formData.password}
                  onChange={handleChange}
                  error={!!errors.password}
                  helperText={errors.password}
                  fullWidth
                  autoComplete="current-password"
                  inputProps={{
                    style: { 
                      padding: "12px 16px",
                    }
                  }}
                  InputProps={{
                    sx: {
                      borderRadius: "8px",
                      backgroundColor: "#ffffff",
                      height: "50px",
                      transition: "all 0.2s",
                      border: "1px solid #cbd5e1",
                      boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                      "& fieldset": { border: "none" },
                      "&:hover": {
                        borderColor: "#94a3b8",
                      },
                      "&.Mui-focused": { 
                        borderColor: "#14b8a6", 
                        boxShadow: "0 0 0 4px rgba(20, 184, 166, 0.1)",
                      },
                      "& input": { 
                        color: "#0f172a",
                        fontSize: "0.95rem",
                      },
                      "& input:-webkit-autofill, & input:-webkit-autofill:hover, & input:-webkit-autofill:focus": {
                        WebkitBoxShadow: "0 0 0 1000px #ffffff inset !important",
                        WebkitTextFillColor: "#0f172a !important",
                        transition: "background-color 5000s ease-in-out 0s",
                      },
                    }
                  }}
                />
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <InfoIcon sx={{ fontSize: "1.2rem", color: "#3b82f6" }} />
                  <Typography variant="body2" sx={{ color: "#1e293b", fontWeight: 600, fontSize: "0.875rem" }}>
                    Password is case-sensitive
                  </Typography>
                </Box>
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

        {/* Right Side: Product Logo Showcase */}
        <Grid
          item
          xs={false}
          md={6}
          sx={{
            position: "relative",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundImage: "url('/login-bg.jpg')",
            display: { xs: "none", md: "flex" },
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            p: { md: 6, lg: 8 },
            overflow: "hidden",
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: "rgba(10, 18, 40, 0.72)",
              backdropFilter: "blur(18px)",
              zIndex: 1,
            }
          }}
        >
          <Box sx={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 460, mx: "auto" }}>

            {/* Header label */}
            <Typography sx={{
              color: "rgba(255,255,255,0.4)",
              fontSize: "0.65rem",
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              textAlign: "center",
              mb: 2,
            }}>
              Our Product Suite
            </Typography>

            {/* ── ERP Management ── */}
            <Box sx={{
              display: "flex", alignItems: "center", gap: 2,
              px: 2.5, py: 1.8, mb: 1.5, borderRadius: 2,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              backdropFilter: "blur(10px)",
              transition: "all 0.25s ease", cursor: "pointer",
              "&:hover": { background: "rgba(255,255,255,0.11)", borderColor: "rgba(30,90,200,0.5)", transform: "translateY(-2px)", boxShadow: "0 8px 28px rgba(0,0,0,0.25)" }
            }}>
              <Box sx={{ flexShrink: 0, width: 48, height: 48 }}>
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="24" cy="24" r="22" fill="rgba(21,101,192,0.15)" stroke="#1565c0" strokeWidth="1.5" />
                  {/* Gear teeth */}
                  <path d="M24 6 L26 2 L28 2 L30 6 L34 7 L37 4 L39 6 L37 10 L38 14 L42 15 L42 17 L42 19 L38 20 L37 24 L39 28 L37 30 L34 27 L30 28 L28 32 L26 32 L24 32 L22 28 L18 27 L15 30 L13 28 L15 24 L14 20 L10 19 L10 17 L10 15 L14 14 L15 10 L13 6 L15 4 L18 7 L22 6 Z" fill="rgba(21,101,192,0.25)" stroke="#1e88e5" strokeWidth="1" strokeLinejoin="round" />
                  <circle cx="24" cy="17" r="5.5" fill="rgba(21,101,192,0.3)" stroke="#42a5f5" strokeWidth="1.5" />
                  <path d="M27 14 A4 4 0 1 0 27 20" stroke="#90caf9" strokeWidth="2" strokeLinecap="round" fill="none" />
                  <rect x="8" y="32" width="32" height="11" rx="3" fill="rgba(21,101,192,0.25)" stroke="#1565c0" strokeWidth="1" />
                  <text x="24" y="41" textAnchor="middle" fill="#90caf9" fontSize="7.5" fontWeight="bold" fontFamily="Arial, sans-serif">ERP</text>
                </svg>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5 }}>
                  <Typography sx={{ color: "#fff", fontWeight: 800, fontSize: "1.05rem", lineHeight: 1 }}>ERP</Typography>
                  <Typography sx={{ color: "#90caf9", fontWeight: 700, fontSize: "0.95rem", lineHeight: 1 }}>Management</Typography>
                </Box>
                <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", mt: 0.4 }}>Enterprise Resource Planning</Typography>
              </Box>
              <ArrowForwardIcon sx={{ color: "rgba(255,255,255,0.2)", fontSize: "0.9rem", flexShrink: 0 }} />
            </Box>

            {/* ── Learning Platform ── */}
            <Box sx={{
              display: "flex", alignItems: "center", gap: 2,
              px: 2.5, py: 1.8, mb: 1.5, borderRadius: 2,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              backdropFilter: "blur(10px)",
              transition: "all 0.25s ease", cursor: "pointer",
              "&:hover": { background: "rgba(255,255,255,0.11)", borderColor: "rgba(33,150,243,0.5)", transform: "translateY(-2px)", boxShadow: "0 8px 28px rgba(0,0,0,0.25)" }
            }}>
              <Box sx={{ flexShrink: 0, width: 48, height: 48 }}>
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="24" cy="24" r="22" fill="rgba(25,118,210,0.12)" stroke="#1976d2" strokeWidth="1.5" />
                  {/* Graduation cap */}
                  <polygon points="24,8 36,14 24,20 12,14" fill="#1976d2" />
                  <rect x="22" y="14" width="4" height="5" rx="0.8" fill="#42a5f5" fillOpacity="0.9" />
                  <circle cx="36" cy="14" r="1.5" fill="#42a5f5" />
                  <line x1="36" y1="14" x2="36" y2="20" stroke="#42a5f5" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="34" y1="20" x2="38" y2="20" stroke="#42a5f5" strokeWidth="1.5" strokeLinecap="round" />
                  {/* Open book */}
                  <path d="M9 26 Q9 40 24 42 Q39 40 39 26 L39 24 Q39 24 24 26 Q9 24 9 24 Z" fill="#1976d2" fillOpacity="0.2" stroke="#1976d2" strokeWidth="1.3" />
                  <line x1="24" y1="26" x2="24" y2="42" stroke="#1976d2" strokeWidth="1.2" strokeDasharray="2 2" />
                  <line x1="12" y1="30" x2="21" y2="29" stroke="#90caf9" strokeWidth="1" strokeLinecap="round" />
                  <line x1="12" y1="33" x2="21" y2="32" stroke="#90caf9" strokeWidth="1" strokeLinecap="round" />
                  <line x1="27" y1="29" x2="36" y2="30" stroke="#90caf9" strokeWidth="1" strokeLinecap="round" />
                  <line x1="27" y1="32" x2="36" y2="33" stroke="#90caf9" strokeWidth="1" strokeLinecap="round" />
                </svg>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5 }}>
                  <Typography sx={{ color: "#fff", fontWeight: 800, fontSize: "1.05rem", lineHeight: 1 }}>Learning</Typography>
                  <Typography sx={{ color: "#42a5f5", fontWeight: 700, fontSize: "0.95rem", lineHeight: 1 }}>Platform</Typography>
                </Box>
                <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", mt: 0.4 }}>Smart Education Management</Typography>
              </Box>
              <ArrowForwardIcon sx={{ color: "rgba(255,255,255,0.2)", fontSize: "0.9rem", flexShrink: 0 }} />
            </Box>

            {/* ── CCTV Security ── */}
            <Box sx={{
              display: "flex", alignItems: "center", gap: 2,
              px: 2.5, py: 1.8, mb: 1.5, borderRadius: 2,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              backdropFilter: "blur(10px)",
              transition: "all 0.25s ease", cursor: "pointer",
              "&:hover": { background: "rgba(255,255,255,0.11)", borderColor: "rgba(13,71,161,0.6)", transform: "translateY(-2px)", boxShadow: "0 8px 28px rgba(0,0,0,0.25)" }
            }}>
              <Box sx={{ flexShrink: 0, width: 48, height: 48 }}>
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Shield */}
                  <path d="M24 4 L40 10 L40 26 C40 35 24 44 24 44 C24 44 8 35 8 26 L8 10 Z" fill="rgba(13,71,161,0.25)" stroke="#1565c0" strokeWidth="2" strokeLinejoin="round" />
                  <path d="M24 8 L36 13 L36 26 C36 33 24 40 24 40 C24 40 12 33 12 26 L12 13 Z" fill="rgba(21,101,192,0.15)" stroke="#42a5f5" strokeWidth="1" strokeLinejoin="round" />
                  {/* Camera body */}
                  <rect x="14" y="19" width="16" height="10" rx="3" fill="#1565c0" fillOpacity="0.8" stroke="#64b5f6" strokeWidth="1" />
                  {/* Camera lens */}
                  <circle cx="22" cy="24" r="4" fill="rgba(100,181,246,0.3)" stroke="#90caf9" strokeWidth="1.5" />
                  <circle cx="22" cy="24" r="2" fill="#42a5f5" fillOpacity="0.7" />
                  {/* Camera tail */}
                  <path d="M30 21 L36 18 L36 30 L30 27 Z" fill="#1565c0" fillOpacity="0.7" stroke="#64b5f6" strokeWidth="0.8" />
                </svg>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5 }}>
                  <Typography sx={{ color: "#fff", fontWeight: 800, fontSize: "1.05rem", lineHeight: 1 }}>CCTV</Typography>
                  <Typography sx={{ color: "#64b5f6", fontWeight: 700, fontSize: "0.95rem", lineHeight: 1 }}>Security</Typography>
                </Box>
                <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", mt: 0.4 }}>Surveillance & Access Control</Typography>
              </Box>
              <ArrowForwardIcon sx={{ color: "rgba(255,255,255,0.2)", fontSize: "0.9rem", flexShrink: 0 }} />
            </Box>

            {/* ── Mobile App ── */}
            <Box sx={{
              display: "flex", alignItems: "center", gap: 2,
              px: 2.5, py: 1.8, mb: 1.5, borderRadius: 2,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              backdropFilter: "blur(10px)",
              transition: "all 0.25s ease", cursor: "pointer",
              "&:hover": { background: "rgba(255,255,255,0.11)", borderColor: "rgba(56,142,60,0.5)", transform: "translateY(-2px)", boxShadow: "0 8px 28px rgba(0,0,0,0.25)" }
            }}>
              <Box sx={{ flexShrink: 0, width: 48, height: 48 }}>
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Phone body */}
                  <rect x="13" y="4" width="22" height="36" rx="4" fill="rgba(56,142,60,0.15)" stroke="#388e3c" strokeWidth="1.8" />
                  <rect x="16" y="8" width="16" height="22" rx="2" fill="rgba(76,175,80,0.2)" stroke="#66bb6a" strokeWidth="1" />
                  {/* Screen content lines */}
                  <rect x="18" y="11" width="12" height="2" rx="1" fill="#81c784" fillOpacity="0.8" />
                  <rect x="18" y="15" width="12" height="2" rx="1" fill="#81c784" fillOpacity="0.6" />
                  <rect x="18" y="19" width="7" height="5" rx="1" fill="#66bb6a" fillOpacity="0.5" />
                  <rect x="27" y="19" width="3" height="5" rx="1" fill="#66bb6a" fillOpacity="0.4" />
                  {/* Home button */}
                  <circle cx="24" cy="36" r="2" fill="#388e3c" fillOpacity="0.6" stroke="#66bb6a" strokeWidth="1" />
                  {/* Swirl arrow */}
                  <path d="M8 36 Q4 28 10 22 Q16 16 20 20" stroke="#43a047" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                  <polygon points="19,17 22,22 16,21" fill="#43a047" />
                  {/* Green dot accent */}
                  <rect x="22" y="6" width="4" height="1.5" rx="0.75" fill="#66bb6a" />
                </svg>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5 }}>
                  <Typography sx={{ color: "#fff", fontWeight: 800, fontSize: "1.05rem", lineHeight: 1 }}>Mobile</Typography>
                  <Typography sx={{ color: "#81c784", fontWeight: 700, fontSize: "0.95rem", lineHeight: 1 }}>Apps</Typography>
                </Box>
                <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", mt: 0.4 }}>Cross-Platform App Development</Typography>
              </Box>
              <ArrowForwardIcon sx={{ color: "rgba(255,255,255,0.2)", fontSize: "0.9rem", flexShrink: 0 }} />
            </Box>

            {/* ── Digital Marketing ── */}
            <Box sx={{
              display: "flex", alignItems: "center", gap: 2,
              px: 2.5, py: 1.8, borderRadius: 2,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              backdropFilter: "blur(10px)",
              transition: "all 0.25s ease", cursor: "pointer",
              "&:hover": { background: "rgba(255,255,255,0.11)", borderColor: "rgba(46,125,50,0.5)", transform: "translateY(-2px)", boxShadow: "0 8px 28px rgba(0,0,0,0.25)" }
            }}>
              <Box sx={{ flexShrink: 0, width: 48, height: 48 }}>
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Megaphone body */}
                  <path d="M8 18 L8 30 L14 30 L30 38 L30 10 L14 18 Z" fill="rgba(46,125,50,0.25)" stroke="#388e3c" strokeWidth="1.8" strokeLinejoin="round" />
                  <rect x="8" y="18" width="6" height="12" rx="1" fill="rgba(76,175,80,0.3)" stroke="#66bb6a" strokeWidth="1" />
                  {/* Sound waves */}
                  <path d="M34 16 Q38 20 38 24 Q38 28 34 32" stroke="#43a047" strokeWidth="2" strokeLinecap="round" fill="none" />
                  <path d="M36 13 Q42 18 42 24 Q42 30 36 35" stroke="#66bb6a" strokeWidth="1.5" strokeLinecap="round" fill="none" strokeOpacity="0.6" />
                  {/* Swirl arrow at bottom */}
                  <path d="M10 36 Q14 44 22 42 Q28 40 28 36" stroke="#43a047" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                  <polygon points="28,32 30,37 24,36" fill="#43a047" />
                  {/* Light rays */}
                  <line x1="33" y1="10" x2="36" y2="7" stroke="#81c784" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="37" y1="14" x2="41" y2="12" stroke="#81c784" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5 }}>
                  <Typography sx={{ color: "#fff", fontWeight: 800, fontSize: "1.05rem", lineHeight: 1 }}>Digital</Typography>
                  <Typography sx={{ color: "#81c784", fontWeight: 700, fontSize: "0.95rem", lineHeight: 1 }}>Marketing</Typography>
                </Box>
                <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", mt: 0.4 }}>SEO · Social · Growth Strategy</Typography>
              </Box>
              <ArrowForwardIcon sx={{ color: "rgba(255,255,255,0.2)", fontSize: "0.9rem", flexShrink: 0 }} />
            </Box>

            {/* Footer */}
            <Typography sx={{ mt: 2, textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: "0.62rem", letterSpacing: "0.08em" }}>
              One platform · Five powerful solutions
            </Typography>

          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
//
