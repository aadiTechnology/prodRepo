/**
 * Login Page - User authentication interface
 * Handles email/password login with RBAC context integration
 */

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation, Link, useSearchParams } from "react-router-dom";
import SelectSchoolModal from "../components/semantic/SelectSchoolModal";
import {
  Box,
  Typography,
  Alert,
  Link as MuiLink,
  Grid,
  Fade,
} from "@mui/material";
import { Button, CircularProgress } from "../components/primitives";
import { EmailInput, PasswordInput } from "../components/semantic";
import { Info as InfoIcon } from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";
import { useRBAC } from "../context/RBACContext";
import { LoginRequest } from "../types/auth";
import type { ApiError } from "../api/client";
import type { TenantSchoolPickerItem } from "../types/tenant";
import publicSchoolService from "../api/services/publicSchoolService";
import AppThemeProvider from "../theme/AppThemeProvider";
import { deriveThemePropsFromTenant } from "../theme/ThemeFromTenantProvider";

// ── Design tokens ─────────────────────────────────────────────────────────
const T = {
  primary: "#1976d2",
  primaryDark: "#1565c0",
  error: "#d32f2f",
  errorBg: "rgba(211, 47, 47, 0.04)",
  textPrimary: "#0f172a",
  textSecondary: "#64748b",
  disabledBg: "#f1f5f9",
  disabledText: "#94a3b8",
  infoIcon: "#0288d1",
  bgPage: "#ffffff",
} as const;

// ── Global Custom Animations ──────────────────────────────────────────────
const globalAnimations = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(-30px); filter: blur(4px); }
    to   { opacity: 1; transform: translateX(0); filter: blur(0); }
  }
  @keyframes pulseDot {
    0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(93,202,165, 0.4); }
    50% { opacity: 0.5; box-shadow: 0 0 0 6px rgba(93,202,165, 0); }
  }
  @keyframes orbFloat1 {
    0% { transform: translate(0, 0) scale(1); }
    33% { transform: translate(40px, -60px) scale(1.1); }
    66% { transform: translate(-20px, 30px) scale(0.9); }
    100% { transform: translate(0, 0) scale(1); }
  }
  @keyframes orbFloat2 {
    0% { transform: translate(0, 0) scale(1); }
    33% { transform: translate(-50px, 50px) scale(1.2); }
    66% { transform: translate(30px, -20px) scale(0.8); }
    100% { transform: translate(0, 0) scale(1); }
  }
`;

// ── Right Side Product SVGs ───────────────────────────────────────────────
const ErpSvg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#85B7EB" strokeWidth="1.8" strokeLinecap="round" style={{ width: 22, height: 22 }}>
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8M12 17v4" />
    <path d="M7 8h4M7 11h2" />
  </svg>
);

const LearningSvg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#5DCAA5" strokeWidth="1.8" strokeLinecap="round" style={{ width: 22, height: 22 }}>
    <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
    <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
  </svg>
);

const CctvSvg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#FAC775" strokeWidth="1.8" strokeLinecap="round" style={{ width: 22, height: 22 }}>
    <path d="M23 7l-7 5 7 5V7z" />
    <rect x="1" y="5" width="15" height="14" rx="2" />
  </svg>
);

const MobileSvg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#85B7EB" strokeWidth="1.8" strokeLinecap="round" style={{ width: 22, height: 22 }}>
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
    <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2" />
  </svg>
);

const MarketingSvg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#ED93B1" strokeWidth="1.8" strokeLinecap="round" style={{ width: 22, height: 22 }}>
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);

// ── Component ────────────────────────────────────────────────────────────────
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { loginWithContext, isAuthenticated } = useAuth();
  const { setRBACData } = useRBAC();

  const [formData, setFormData] = useState<LoginRequest>({ email: "", password: "" });
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [schoolPreview, setSchoolPreview] = useState<TenantSchoolPickerItem | null>(null);
  const [schoolModalOpen, setSchoolModalOpen] = useState(false);

  const tenantIdFromQuery = useMemo(() => {
    const raw = searchParams.get("tenant");
    if (!raw || !/^\d+$/.test(raw)) return undefined;
    return Number(raw);
  }, [searchParams]);

  useEffect(() => {
    if (tenantIdFromQuery === undefined) {
      setSchoolPreview(null);
      return;
    }
    const id = tenantIdFromQuery;
    try {
      const cached = sessionStorage.getItem(`schoolLoginPreview:${id}`);
      if (cached) {
        const parsed = JSON.parse(cached) as TenantSchoolPickerItem;
        if (parsed && parsed.id === id) {
          setSchoolPreview(parsed);
        }
      }
    } catch {
      /* ignore */
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await publicSchoolService.get(id);
        if (!cancelled) {
          setSchoolPreview(data);
          try {
            sessionStorage.setItem(`schoolLoginPreview:${id}`, JSON.stringify(data));
          } catch {
            /* ignore */
          }
        }
      } catch {
        if (!cancelled) setSchoolPreview(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantIdFromQuery]);

  useEffect(() => {
    if (isAuthenticated) {
      const statePath = (location.state as { from?: Location })?.from?.pathname;
      const from = statePath && statePath.startsWith("/") && !statePath.includes("http") ? statePath : "/";
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};
    if (!formData.email.trim()) {
      newErrors.email = "Please enter Email Address.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) || formData.email.length > 254) {
      newErrors.email = "Please enter a valid Email Address.";
    }
    if (!formData.password) {
      newErrors.password = "Please enter Password.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSchoolSelected = (school: TenantSchoolPickerItem) => {
    try {
      sessionStorage.setItem(`schoolLoginPreview:${school.id}`, JSON.stringify(school));
    } catch {
      /* ignore */
    }
    setSearchParams({ tenant: String(school.id) }, { replace: true });
    setSchoolModalOpen(false);
    setError(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof typeof errors]) setErrors((prev) => ({ ...prev, [name]: undefined }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const response = await loginWithContext({
        ...formData,
        ...(tenantIdFromQuery !== undefined ? { tenant_id: tenantIdFromQuery } : {}),
      });
      setRBACData({ roles: response.roles, menus: response.menus, permissions: response.permissions });
    } catch (err) {
      const apiErr = err as ApiError;
      const status = apiErr.response?.status;
      const rawDetail = apiErr.response?.data?.detail;
      const msg = typeof rawDetail === "string" ? rawDetail : apiErr.message;
      if (status === 403 && tenantIdFromQuery !== undefined) {
        setError(
          msg ||
            `This account is not registered with ${schoolPreview?.name ?? "the selected school"}. Please select the correct school.`,
        );
      } else if (status === 403) {
        setError(msg || "You do not have permission to sign in.");
      } else {
        setError("Invalid credentials.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isButtonDisabled = !formData.email.trim() || !formData.password || isSubmitting;
  if (isAuthenticated) return null;

  const tenantTheme = schoolPreview ? deriveThemePropsFromTenant(schoolPreview) : null;

  const page = (
    <Box sx={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden", backgroundColor: T.bgPage }}>
      <style>{globalAnimations}</style>
      <Grid container sx={{ flex: 1, height: "100%" }}>

        {/* ── LEFT: Login Form (Premium Translucent Context) ─────────────────────── */}
        <Grid
          item
          xs={12}
          md={6}
          sx={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            px: { xs: 4, md: 7, lg: 10 },
            py: { xs: 4, md: 6 },
            backgroundColor: "#ffffff", // Pure ultra-clean white
            position: "relative",
            zIndex: 2,
          }}
        >
          {/* Subtle light orbs for the left side background to make it less stark */}
          <Box sx={{ position: "absolute", top: "-10%", left: "-10%", width: "60%", height: "60%", background: "radial-gradient(circle, rgba(25,118,210,0.04) 0%, transparent 60%)", filter: "blur(60px)", zIndex: 0, pointerEvents: "none", animation: "orbFloat1 24s infinite ease-in-out" }} />
          <Box sx={{ position: "absolute", bottom: "-10%", right: "-10%", width: "60%", height: "60%", background: "radial-gradient(circle, rgba(93,202,165,0.04) 0%, transparent 60%)", filter: "blur(60px)", zIndex: 0, pointerEvents: "none", animation: "orbFloat2 28s infinite ease-in-out" }} />

          <Box sx={{ 
            width: "100%", 
            maxWidth: 480, // Matched closer to the right-side 520px to balance visual weight
            animation: "fadeUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) both",
            position: "relative",
            zIndex: 1,
          }}>
            
            {/* Brand */}
            <Box sx={{ mb: 4, textAlign: "left" }}>
              {schoolPreview?.logo_url ? (
                <Box
                  component="img"
                  src={schoolPreview.logo_url}
                  alt={schoolPreview.name}
                  sx={{ maxHeight: 88, width: "auto", mb: 2.5, display: "block", objectFit: "contain" }}
                />
              ) : (
                <Box
                  component="img"
                  src="/aadi-logo.png"
                  alt="Aadi Technology"
                  sx={{ height: 76, width: "auto", mb: 3.5, display: "block" }}
                />
              )}
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 800,
                  color: "#0a1532",
                  mb: 1,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.3,
                  fontFamily: "'Sora', sans-serif",
                }}
              >
                Sign in to your account
              </Typography>
              <Typography variant="body1" sx={{ color: "#6b7a99", lineHeight: 1.6, fontWeight: 500 }}>
                Enter your credentials to access the platform.
              </Typography>
            </Box>

            {/* Error alert */}
            {error && (
              <Fade in>
                <Alert
                  severity="error"
                  variant="outlined"
                  sx={{
                    mb: 3,
                    borderRadius: 1.5,
                    borderColor: T.error,
                    backgroundColor: T.errorBg,
                    color: T.error,
                    "& .MuiAlert-icon": { color: T.error },
                  }}
                >
                  {error}
                </Alert>
              </Fade>
            )}

            {/* Form */}
            <Box
              component="form"
              onSubmit={handleSubmit}
              noValidate
              sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}
            >
              {/* Email */}
              <Box sx={{ animation: "fadeUp 0.5s 0.1s ease both" }}>
                <EmailInput
                  name="email"
                  placeholder="Enter your email"
                  label="Email Address"
                  value={formData.email}
                  onChange={handleChange}
                  error={!!errors.email}
                  helperText={errors.email}
                  fullWidth
                  autoComplete="email"
                  autoFocus
                  required
                />
              </Box>

              {/* Password */}
              <Box sx={{ animation: "fadeUp 0.5s 0.18s ease both" }}>
                <PasswordInput
                  name="password"
                  placeholder="Enter your password"
                  label="Password"
                  value={formData.password}
                  onChange={handleChange}
                  error={!!errors.password}
                  helperText={errors.password}
                  fullWidth
                  autoComplete="current-password"
                  required
                />
              </Box>

              {/* Info row */}
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", animation: "fadeUp 0.5s 0.25s ease both" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <InfoIcon sx={{ fontSize: "1.1rem", color: T.infoIcon }} />
                  <Typography variant="body2" sx={{ color: T.textPrimary, fontWeight: 500, fontSize: "0.82rem" }}>
                    Password is case-sensitive
                  </Typography>
                </Box>
                <MuiLink
                  component={Link}
                  to="/forgot-password"
                  sx={{
                    color: T.primary,
                    textDecoration: "none",
                    fontWeight: 600,
                    fontSize: "0.82rem",
                    "&:hover": { color: T.primaryDark, textDecoration: "underline" },
                  }}
                >
                  Forgot password?
                </MuiLink>
              </Box>

              {/* Submit */}
              <Box sx={{ animation: "fadeUp 0.5s 0.3s ease both" }}>
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={isButtonDisabled}
                  sx={{
                    mt: 1,
                    height: "54px",
                    borderRadius: "14px",
                    background: "linear-gradient(135deg, #1976d2 0%, #115293 100%)",
                    textTransform: "none",
                    fontWeight: 800,
                    fontSize: "1.05rem",
                    letterSpacing: "0.01em",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    boxShadow: "0 8px 24px rgba(25,118,210,0.25), inset 0 1px 0 rgba(255,255,255,0.15)",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      background: "linear-gradient(135deg, #1565c0 0%, #0a3375 100%)",
                      boxShadow: "0 12px 32px rgba(25,118,210,0.35), inset 0 1px 0 rgba(255,255,255,0.1)",
                      transform: "translateY(-2px)"
                    },
                    "&.Mui-disabled": {
                      background: "rgba(25,118,210,0.4)",
                      color: "rgba(255,255,255,0.6)",
                      boxShadow: "none",
                    },
                  }}
                >
                  {isSubmitting
                    ? <CircularProgress size={22} sx={{ color: "rgba(255,255,255,0.8)" }} />
                    : "Sign In"}
                </Button>
              </Box>

              {/* Register link */}
              <Box sx={{ textAlign: "center", animation: "fadeUp 0.5s 0.35s ease both" }}>
                <Typography variant="body2" sx={{ color: T.textSecondary }}>
                  Don't have an account?{" "}
                  <MuiLink
                    component={Link}
                    to="/register"
                    sx={{
                      color: T.primary,
                      textDecoration: "none",
                      fontWeight: 700,
                      "&:hover": { textDecoration: "underline", color: T.primaryDark },
                    }}
                  >
                    Register
                  </MuiLink>
                </Typography>
              </Box>

              <Box sx={{ textAlign: "center", mt: 1.5, animation: "fadeUp 0.5s 0.38s ease both" }}>
                <MuiLink
                  component="button"
                  type="button"
                  onClick={() => setSchoolModalOpen(true)}
                  sx={{
                    color: T.primary,
                    textDecoration: "none",
                    fontWeight: 600,
                    fontSize: "0.82rem",
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    p: 0,
                    "&:hover": { textDecoration: "underline", color: T.primaryDark },
                  }}
                >
                  Change School for Login
                </MuiLink>
              </Box>
            </Box>
          </Box>
        </Grid>

        {/* ── RIGHT: Product Suite (Premium SaaS Translucent Context) ─────────────── */}
        <Grid
          item
          xs={false}
          md={6}
          sx={{
            display: { xs: "none", md: "flex" },
            flexDirection: "column",
            justifyContent: "center",
            padding: { md: "40px 60px", lg: "40px 80px" },
            height: "100%",
            position: "relative",
            overflow: "hidden",
            background: "#060b19", // Ultra deep premium space blue
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          {/* Animated blurred orbs for premium translucent effect */}
          <Box
            sx={{
              position: "absolute",
              top: "-15%",
              left: "-15%",
              width: "60%",
              height: "60%",
              background: "radial-gradient(circle, rgba(25,118,210,0.35) 0%, transparent 60%)",
              filter: "blur(80px)",
              animation: "orbFloat1 20s infinite ease-in-out",
              zIndex: 1,
            }}
          />
          <Box
            sx={{
              position: "absolute",
              bottom: "-15%",
              right: "-10%",
              width: "70%",
              height: "70%",
              background: "radial-gradient(circle, rgba(93,202,165,0.25) 0%, transparent 65%)",
              filter: "blur(80px)",
              animation: "orbFloat2 24s infinite ease-in-out",
              zIndex: 1,
            }}
          />

          <Box sx={{ position: "relative", zIndex: 2, maxWidth: 520, mx: "auto", width: "100%" }}>
            
            <Typography
              variant="h3"
              sx={{
                fontWeight: 800,
                color: "#ffffff",
                lineHeight: 1.25,
                mb: 1.5,
                animation: "fadeUp 0.8s 0.1s cubic-bezier(0.4, 0, 0.2, 1) both",
                fontFamily: "'Sora', sans-serif",
                fontSize: { md: "2rem", lg: "2.4rem" },
                letterSpacing: "-0.03em",
              }}
            >
              One platform.<br />Total campus control.
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: "rgba(255,255,255,0.65)",
                mb: 5,
                animation: "fadeUp 0.8s 0.2s cubic-bezier(0.4, 0, 0.2, 1) both",
                fontSize: "1.05rem",
                fontWeight: 500,
              }}
            >
              Trusted by 500+ schools across Maharashtra.
            </Typography>

            {/* Feature Cards Sequence */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.2 }}>
              {[
                { name: "ERP Management", desc: "Fees, payroll, inventory & HR — unified.", icon: <ErpSvg />, bg: "rgba(25,118,210,0.2)", dot: true, tag: "Live", delay: "0.25s" },
                { name: "Learning Platform", desc: "Assignments, tests & live classes in one place.", icon: <LearningSvg />, bg: "rgba(93,202,165,0.15)", dot: true, tag: "Live", delay: "0.35s" },
                { name: "CCTV Security", desc: "Live campus feeds, motion alerts & recordings.", icon: <CctvSvg />, bg: "rgba(239,159,39,0.15)", dot: false, tag: "New", delay: "0.45s" },
                { name: "Mobile Apps", desc: "Parent & student apps for Android and iOS.", icon: <MobileSvg />, bg: "rgba(133,183,235,0.15)", dot: true, tag: "Live", delay: "0.55s" },
                { name: "Digital Marketing", desc: "Admission campaigns, SEO & social outreach.", icon: <MarketingSvg />, bg: "rgba(212,83,126,0.15)", dot: false, tag: "New", delay: "0.65s" },
              ].map((item: any, i: number) => (
                <Box
                  key={i}
                  sx={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "16px",
                    padding: "16px 22px",
                    display: "flex",
                    alignItems: "center",
                    gap: 2.5,
                    backdropFilter: "blur(24px)",
                    WebkitBackdropFilter: "blur(24px)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
                    transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
                    cursor: "pointer",
                    animation: `slideIn 0.7s ${item.delay} cubic-bezier(0.4, 0, 0.2, 1) both`,
                    "&:hover": {
                      background: "rgba(255,255,255,0.06)",
                      borderColor: "rgba(25,118,210,0.5)",
                      transform: "translateX(8px) scale(1.01)",
                      boxShadow: "0 16px 48px rgba(0,0,0,0.25)",
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      background: item.bg,
                      boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.1)",
                    }}
                  >
                    {item.icon}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: "1rem", fontWeight: 700, color: "#fff", mb: 0.25, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {item.name}
                    </Typography>
                    <Typography sx={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.4, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {item.desc}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      padding: "4px 12px",
                      borderRadius: "20px",
                      flexShrink: 0,
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      background: item.tag === "Live" ? "rgba(15,110,86,0.25)" : "rgba(25,118,210,0.2)",
                      color: item.tag === "Live" ? "#5DCAA5" : "#85B7EB",
                      border: `1px solid ${item.tag === "Live" ? "rgba(93,202,165,0.4)" : "rgba(133,183,235,0.4)"}`,
                      boxShadow: item.tag === "Live" ? "0 0 12px rgba(93,202,165,0.1)" : "0 0 12px rgba(133,183,235,0.1)",
                    }}
                  >
                    {item.dot && (
                      <Box component="span" sx={{ width: 6, height: 6, backgroundColor: "#5DCAA5", borderRadius: "50%", display: "inline-block", mr: 1, animation: "pulseDot 2s infinite" }} />
                    )}
                    {item.tag}
                  </Box>
                </Box>
              ))}
            </Box>

            {/* Pagination dots */}
            <Box sx={{ display: "flex", gap: 1.5, mt: 5, animation: "fadeUp 0.8s 0.8s cubic-bezier(0.4, 0, 0.2, 1) both" }}>
              <Box sx={{ width: 28, height: 6, borderRadius: 2, background: T.primary, boxShadow: "0 0 12px rgba(25,118,210,0.4)" }} />
              <Box sx={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.2)", transition: "0.3s", "&:hover": { background: "rgba(255,255,255,0.5)" } }} />
              <Box sx={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.2)", transition: "0.3s", "&:hover": { background: "rgba(255,255,255,0.5)" } }} />
            </Box>
          </Box>
        </Grid>
      </Grid>

      <SelectSchoolModal
        open={schoolModalOpen}
        onClose={() => setSchoolModalOpen(false)}
        onSchoolSelected={handleSchoolSelected}
        selectedSchoolId={tenantIdFromQuery ?? null}
      />
    </Box>
  );

  if (tenantTheme) {
    return (
      <AppThemeProvider
        tenantConfig={tenantTheme.tenantConfig}
        tokenOverrides={tenantTheme.tokenOverrides}
        logoUrl={tenantTheme.logoUrl}
      >
        {page}
      </AppThemeProvider>
    );
  }

  return page;
}
