import { useState, useMemo } from "react";
import {
    Box,
    Button,
    Paper,
    Typography,
    Grid,
    TextField,
    FormControlLabel,
    Switch,
    Alert,
    CircularProgress,
    Divider,
    Breadcrumbs,
    Link,
    IconButton,
    InputAdornment,
    Stack,
    LinearProgress,
} from "@mui/material";
import {
    Home as HomeIcon,
    ArrowBack as BackIcon,
    Business as BusinessIcon,
    Person as PersonIcon,
    Security as SecurityIcon,
    Visibility,
    VisibilityOff,
    ErrorOutline as ErrorIcon,
} from "@mui/icons-material";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import tenantService from "../../api/services/tenantService";

const AddTenant = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        owner_name: "",
        email: "",
        admin_password: "",
        confirm_password: "",
        phone: "",
        description: "",
        is_active: true,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, checked, type } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" || name === "is_active" ? checked : value,
        }));
    };

    const getPasswordStrength = (password: string) => {
        if (!password) return 0;
        let strength = 0;
        if (password.length >= 8) strength += 25;
        if (/[A-Z]/.test(password)) strength += 25;
        if (/[0-9]/.test(password)) strength += 25;
        if (/[^A-Za-z0-9]/.test(password)) strength += 25;
        return strength;
    };

    const passwordStrength = useMemo(() => getPasswordStrength(formData.admin_password), [formData.admin_password]);

    const getStrengthColor = (strength: number) => {
        if (strength <= 25) return "#ef4444";
        if (strength <= 50) return "#f59e0b";
        if (strength <= 75) return "#3b82f6";
        return "#10b981";
    };

    const validate = () => {
        if (formData.admin_password !== formData.confirm_password) {
            setError("Passwords do not match.");
            return false;
        }
        if (formData.admin_password.length < 8) {
            setError("Password must be at least 8 characters.");
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        try {
            setLoading(true);
            setError(null);
            const result = await tenantService.provision({
                name: formData.name,
                owner_name: formData.owner_name,
                email: formData.email,
                admin_password: formData.admin_password,
                phone: formData.phone,
                description: formData.description,
                is_active: formData.is_active,
            });

            setSuccess(result.message || "Tenant created successfully!");
            setTimeout(() => navigate("/tenants"), 2000);
        } catch (err: any) {
            setError(err?.message || "Failed to provision tenant.");
        } finally {
            setLoading(false);
        }
    };

    // Shared Styles
    const inputLabelSx = {
        fontSize: "0.875rem",
        fontWeight: 600,
        color: "#64748b",
        mb: 1,
        display: "block"
    };

    const textFieldSx = {
        "& .MuiOutlinedInput-root": {
            borderRadius: "8px",
            height: "44px",
            backgroundColor: "white",
            "& fieldset": { borderColor: "#e2e8f0" },
            "&:hover fieldset": { borderColor: "#cbd5e1" },
            "&.Mui-focused fieldset": { borderColor: "#1a1a2e", borderWidth: "1.5px" },
        },
        "& .MuiInputBase-input::placeholder": {
            color: "#94a3b8",
            opacity: 1
        },
        mb: 3
    };

    const sectionLabelSx = {
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        mb: 3,
        color: "#64748b",
        "& .MuiSvgIcon-root": { fontSize: 20 }
    };

    return (
        <Box sx={{
            p: { xs: 2, md: 4 },
            pt: 0,
            backgroundColor: "#f5f6fa",
            minHeight: "100vh",
            color: "#1a1a2e"
        }}>
            {/* Breadcrumbs */}
            <Breadcrumbs sx={{ mb: 1.5, py: 1 }}>
                <Link component={RouterLink} to="/tenants" underline="hover" sx={{ color: "#64748b", fontSize: "0.875rem" }}>
                    Tenants
                </Link>
                <Typography sx={{ color: "#1a1a2e", fontSize: "0.875rem", fontWeight: 500 }}>Add Tenant</Typography>
            </Breadcrumbs>

            {/* Page Header Box */}
            <Paper sx={{
                p: 2.5,
                mb: 4,
                borderRadius: "16px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                border: "1px solid #e2e8f0",
                bgcolor: "white"
            }}>
                <Box sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <IconButton
                            onClick={() => navigate("/")}
                            sx={{
                                backgroundColor: "#1a1a2e",
                                p: 1.25,
                                borderRadius: "10px",
                                "&:hover": { backgroundColor: "#2d2d44" }
                            }}
                        >
                            <HomeIcon sx={{ color: "white", fontSize: 24 }} />
                        </IconButton>
                        <Typography variant="h5" sx={{ fontWeight: 700, fontSize: "24px" }}>
                            Create New Tenant
                        </Typography>
                    </Box>
                    <Button
                        variant="outlined"
                        startIcon={<BackIcon />}
                        onClick={() => navigate("/tenants")}
                        sx={{
                            color: "#64748b",
                            borderColor: "#e2e8f0",
                            textTransform: "none",
                            fontWeight: 600,
                            px: 2,
                            borderRadius: "8px",
                            "&:hover": { bgcolor: "#f8fafc", borderColor: "#cbd5e1" }
                        }}
                    >
                        Back to List
                    </Button>
                </Box>
            </Paper>

            {/* Main Form container - Fluid width to match header */}
            <form onSubmit={handleSubmit} noValidate>
                <Paper sx={{
                    p: { xs: 3, md: 5 },
                    borderRadius: "16px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                    border: "1px solid #e2e8f0",
                    bgcolor: "white",
                    mb: 5
                }}>
                    {/* Status Messages */}
                    {error && (
                        <Alert
                            severity="error"
                            icon={<ErrorIcon />}
                            sx={{ mb: 4, borderRadius: "10px", border: "1px solid #fee2e2" }}
                            onClose={() => setError(null)}
                        >
                            {error}
                        </Alert>
                    )}
                    {success && (
                        <Alert
                            severity="success"
                            sx={{ mb: 4, borderRadius: "10px", bgcolor: "#ecfdf5", color: "#065f46", border: "1px solid #d1fae5" }}
                        >
                            {success}
                        </Alert>
                    )}

                    {/* Company Information section */}
                    <Box sx={sectionLabelSx}>
                        <BusinessIcon />
                        <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: "1px", color: "#64748b", fontSize: "0.75rem" }}>
                            Company Information
                        </Typography>
                    </Box>

                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <Typography sx={inputLabelSx}>Company Name *</Typography>
                            <TextField
                                fullWidth
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                placeholder="e.g. Acme Corporation"
                                sx={textFieldSx}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Typography sx={inputLabelSx}>Phone Number</Typography>
                            <TextField
                                fullWidth
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="e.g. +1 (555) 000-0000"
                                sx={textFieldSx}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Typography sx={inputLabelSx}>Description</Typography>
                            <TextField
                                fullWidth
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                multiline
                                rows={3}
                                placeholder="Briefly describe the tenant's purpose"
                                sx={{ ...textFieldSx, "& .MuiOutlinedInput-root": { ...textFieldSx["& .MuiOutlinedInput-root"], height: "auto" } }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Box sx={{ p: 2.5, bgcolor: "#f8fafc", borderRadius: "12px", border: "1px solid #f1f5f9" }}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={formData.is_active}
                                            onChange={handleChange}
                                            name="is_active"
                                            sx={{
                                                "& .MuiSwitch-switchBase.Mui-checked": { color: "#10b981" },
                                                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#10b981" }
                                            }}
                                        />
                                    }
                                    label={
                                        <Box sx={{ ml: 1.5 }}>
                                            <Typography sx={{ fontSize: "0.938rem", fontWeight: 600, color: "#1e293b" }}>Active Status</Typography>
                                            <Typography variant="caption" sx={{ color: "#64748b", display: "block" }}>
                                                Enable or disable this tenant account immediately
                                            </Typography>
                                        </Box>
                                    }
                                />
                            </Box>
                        </Grid>
                    </Grid>

                    <Divider sx={{ my: 6, borderColor: "#f1f5f9" }} />

                    {/* Admin Account section */}
                    <Box sx={sectionLabelSx}>
                        <PersonIcon />
                        <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: "1px", color: "#64748b", fontSize: "0.75rem" }}>
                            Admin Account
                        </Typography>
                    </Box>

                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <Typography sx={inputLabelSx}>Owner Full Name *</Typography>
                            <TextField
                                fullWidth
                                name="owner_name"
                                value={formData.owner_name}
                                onChange={handleChange}
                                required
                                placeholder="John Doe"
                                sx={textFieldSx}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Typography sx={inputLabelSx}>Admin Email Address *</Typography>
                            <TextField
                                fullWidth
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                placeholder="admin@company.com"
                                sx={textFieldSx}
                            />
                        </Grid>
                    </Grid>

                    <Divider sx={{ my: 6, borderColor: "#f1f5f9" }} />

                    {/* Security Credentials section */}
                    <Box sx={sectionLabelSx}>
                        <SecurityIcon />
                        <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: "1px", color: "#64748b", fontSize: "0.75rem" }}>
                            Security Credentials
                        </Typography>
                    </Box>

                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <Typography sx={inputLabelSx}>Admin Password *</Typography>
                            <TextField
                                fullWidth
                                name="admin_password"
                                type={showPassword ? "text" : "password"}
                                value={formData.admin_password}
                                onChange={handleChange}
                                required
                                placeholder="••••••••"
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton size="small" onClick={() => setShowPassword(!showPassword)} sx={{ color: "#94a3b8" }}>
                                                {showPassword ? <VisibilityOff sx={{ fontSize: 20 }} /> : <Visibility sx={{ fontSize: 20 }} />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{ ...textFieldSx, mb: 1.5 }}
                            />
                            {/* Password strength bar */}
                            <Box sx={{ mt: 1, px: 0.5 }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                                    <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>
                                        Strength
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: getStrengthColor(passwordStrength), fontWeight: 700 }}>
                                        {passwordStrength <= 25 ? "Weak" : passwordStrength <= 50 ? "Fair" : passwordStrength <= 75 ? "Good" : "Strong"}
                                    </Typography>
                                </Stack>
                                <LinearProgress
                                    variant="determinate"
                                    value={passwordStrength}
                                    sx={{
                                        height: 6,
                                        borderRadius: 3,
                                        bgcolor: "#f1f5f9",
                                        "& .MuiLinearProgress-bar": {
                                            bgcolor: getStrengthColor(passwordStrength),
                                            borderRadius: 3
                                        }
                                    }}
                                />
                                <Typography variant="caption" sx={{ color: "#94a3b8", mt: 1, display: "block", fontSize: "0.75rem" }}>
                                    Minimum 8 characters
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Typography sx={inputLabelSx}>Confirm Password *</Typography>
                            <TextField
                                fullWidth
                                name="confirm_password"
                                type={showConfirmPassword ? "text" : "password"}
                                value={formData.confirm_password}
                                onChange={handleChange}
                                required
                                placeholder="••••••••"
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton size="small" onClick={() => setShowConfirmPassword(!showConfirmPassword)} sx={{ color: "#94a3b8" }}>
                                                {showConfirmPassword ? <VisibilityOff sx={{ fontSize: 20 }} /> : <Visibility sx={{ fontSize: 20 }} />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                                sx={textFieldSx}
                            />
                        </Grid>
                    </Grid>

                    {/* Submit Button aligned to right */}
                    <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 8 }}>
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={loading}
                            sx={{
                                height: "52px",
                                px: 10,
                                borderRadius: "10px",
                                backgroundColor: "#1a1a2e",
                                fontSize: "1rem",
                                fontWeight: 700,
                                textTransform: "none",
                                boxShadow: "0 4px 6px -1px rgba(26, 26, 46, 0.2)",
                                "&:hover": {
                                    backgroundColor: "#2d2d44",
                                    boxShadow: "0 10px 15px -3px rgba(26, 26, 46, 0.3)"
                                },
                                "&.Mui-disabled": { backgroundColor: "#cbd5e1" }
                            }}
                        >
                            {loading ? (
                                <CircularProgress size={24} sx={{ color: "white" }} />
                            ) : (
                                "Create Tenant Account"
                            )}
                        </Button>
                    </Box>
                </Paper>
            </form>
        </Box>
    );
};

export default AddTenant;
