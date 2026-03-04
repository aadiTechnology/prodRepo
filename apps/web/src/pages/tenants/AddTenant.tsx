import { useState, useEffect, useCallback } from "react";
import {
    Box,
    Paper,
    Typography,
    Grid,
    TextField,
    FormControlLabel,
    Switch,
    Alert,
    CircularProgress,
    IconButton,
    InputAdornment,
    Stack,
    Tooltip,
    Button,
} from "@mui/material";
import {
    Home as HomeIcon,
    Business as BusinessIcon,
    Person as PersonIcon,
    Security as SecurityIcon,
    Visibility,
    VisibilityOff,
    ErrorOutline as ErrorIcon,
    Lock as LockIcon,
    Save as SaveIcon,
    Cancel as CancelIcon,
} from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import tenantService from "../../api/services/tenantService";

const AddTenant = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id?: string }>();
    const isEditMode = Boolean(id);

    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(isEditMode);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
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

    // Load existing tenant when in edit mode
    const fetchTenant = useCallback(async () => {
        if (!id) return;
        try {
            setFetchLoading(true);
            const data = await tenantService.get(Number(id));
            setFormData({
                name: data.name || "",
                owner_name: data.owner_name || "",
                email: data.email || "",
                admin_password: "",
                confirm_password: "",
                phone: data.phone || "",
                description: data.description || "",
                is_active: data.is_active,
            });
        } catch (err: any) {
            setError(err?.message || "Failed to load tenant.");
        } finally {
            setFetchLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (isEditMode) fetchTenant();
    }, [fetchTenant, isEditMode]);

    const validateField = (name: string, value: any) => {
        let error = "";
        if (name === "name") {
            if (!value) error = "Please enter Tenant Name.";
            else if (value.length < 3) error = "Minimum 3 characters required.";
        } else if (name === "owner_name") {
            if (!value) error = "Please enter Owner Name.";
        } else if (name === "email") {
            if (!value) error = "Please enter Email Address.";
            else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = "Please enter valid Email Address.";
        } else if (name === "phone" && value) {
            if (!/^\d+$/.test(value)) error = "Numeric only.";
            else if (value.length < 10 || value.length > 15) error = "10–15 digits required.";
        } else if (!isEditMode) {
            if (name === "admin_password") {
                if (!value) error = "Please enter Password.";
                else if (value.length < 8) error = "Password must be at least 8 characters.";
            } else if (name === "confirm_password") {
                if (!value) error = "Please confirm Password.";
                else if (value !== formData.admin_password) error = "Passwords do not match.";
            }
        }
        return error;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, checked, type } = e.target;
        const fieldValue = type === "checkbox" || name === "is_active" ? checked : value;

        setFormData((prev) => ({
            ...prev,
            [name]: fieldValue,
        }));

        // Real-time validation
        const fieldError = validateField(name, fieldValue);
        setErrors(prev => ({ ...prev, [name]: fieldError }));
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        const fieldsToValidate = ["name", "owner_name", "email", "phone"];
        if (!isEditMode) {
            fieldsToValidate.push("admin_password", "confirm_password");
        }

        fieldsToValidate.forEach(field => {
            const error = validateField(field, formData[field as keyof typeof formData]);
            if (error) newErrors[field] = error;
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmitAction = async () => {
        if (!validateForm()) return;
        try {
            setLoading(true);
            setError(null);
            if (isEditMode && id) {
                await tenantService.update(Number(id), {
                    name: formData.name,
                    owner_name: formData.owner_name,
                    phone: formData.phone,
                    description: formData.description,
                    is_active: formData.is_active,
                });
                setSuccess("Tenant updated successfully!");
                setTimeout(() => navigate("/tenants"), 1000);
            } else {
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
                setTimeout(() => navigate("/tenants"), 1000);
            }
        } catch (err: any) {
            const msg = err?.message || "";
            if (msg.toLowerCase().includes("email already exists")) {
                setErrors(prev => ({ ...prev, email: "Email already exists." }));
            }
            setError(msg || (isEditMode ? "Failed to update tenant." : "Failed to provision tenant."));
        } finally {
            setLoading(false);
        }
    };

    // Standardized Premium Styling (Reduced Scale to match TenantList)
    const textFieldSx = (name: string) => ({
        "& .MuiOutlinedInput-root": {
            borderRadius: "12px",
            backgroundColor: formData[name as keyof typeof formData] ? "white" : "#fcfdfe",
            fontSize: "0.95rem",
            fontWeight: 500,
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            "& fieldset": {
                borderColor: errors[name] ? "#ef4444" : "#e2e8f0",
                borderWidth: errors[name] ? "1.5px" : "1.2px"
            },
            "&:hover fieldset": { borderColor: errors[name] ? "#ef4444" : "#cbd5e1" },
            "&.Mui-focused": {
                backgroundColor: "white",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.03)",
                "& fieldset": {
                    borderColor: errors[name] ? "#ef4444" : "#1A1A2E",
                    borderWidth: "2px"
                },
            },
        },
        "& .MuiInputLabel-root": {
            fontSize: "0.9rem",
            color: errors[name] ? "#ef4444" : "#94a3b8",
            fontWeight: 500,
            transform: "translate(14px, 14px) scale(1)",
            transition: "all 0.2s ease-out",
            pointerEvents: "none",
            "&.MuiInputLabel-shrink": {
                transform: "translate(12px, -9px) scale(0.75)",
                fontWeight: 700,
                color: errors[name] ? "#ef4444" : "#1A1A2E",
                backgroundColor: "white",
                padding: "0 6px",
            }
        },
        "& .MuiFormHelperText-root": {
            marginLeft: "4px",
            marginTop: "4px",
            fontWeight: 500
        }
    });

    const requiredLabel = (text: string) => (
        <Box component="span">
            {text} <Box component="span" sx={{ color: "#ef4444" }}>*</Box>
        </Box>
    );

    const isFormValid =
        formData.name.length >= 3 &&
        Boolean(formData.owner_name) &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) &&
        Object.values(errors).every(error => !error) &&
        (!isEditMode ? (formData.admin_password.length >= 8 && formData.confirm_password === formData.admin_password) : true);

    if (fetchLoading) return <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}><CircularProgress /></Box>;

    return (
        <Box sx={{ px: { xs: 2, md: 4 }, pb: 2, backgroundColor: "#f8fafc", height: "100vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>

            {/* Header - Aligned with TenantList */}
            <Box sx={{ pt: 1.5, pb: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <IconButton onClick={() => navigate("/")} sx={{ backgroundColor: "#1a1a2e", borderRadius: 1.2, width: 44, height: 44, "&:hover": { backgroundColor: "#2d2d44" } }}>
                        <HomeIcon sx={{ color: "white", fontSize: 24 }} />
                    </IconButton>
                    <Typography variant="h5" sx={{ fontWeight: 700, fontSize: "22px", color: "#1A1A2E", letterSpacing: "-1px" }}>
                        <Box component="span" onClick={() => navigate("/tenants")} sx={{ color: "#94a3b8", cursor: "pointer", "&:hover": { color: "#1a1a2e" } }}>Tenants</Box>
                        <Box component="span" sx={{ color: "#cbd5e1", mx: 1.5 }}>/</Box>
                        {isEditMode ? "Edit Tenant" : "Add Tenant"}
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1.5}>
                    <Tooltip title="Cancel and Go Back">
                        <IconButton
                            onClick={() => navigate("/tenants")}
                            sx={{
                                color: "#64748b",
                                backgroundColor: "#f1f5f9",
                                borderRadius: 1.2,
                                width: 44,
                                height: 44,
                                "&:hover": {
                                    backgroundColor: "#fee2e2",
                                    color: "#ef4444",
                                    transform: "translateY(-1px)"
                                }
                            }}
                        >
                            <CancelIcon sx={{ fontSize: 24 }} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={isEditMode ? "Update Tenant" : "Save Tenant"}>
                        <IconButton
                            onClick={handleSubmitAction}
                            disabled={loading || !isFormValid}
                            sx={{
                                backgroundColor: "#1a1a2e",
                                color: "white",
                                borderRadius: 1.2,
                                width: 44, height: 44,
                                boxShadow: "0 4px 10px rgba(26,26,46,0.2)",
                                "&:hover": { backgroundColor: "#2d2d44", transform: "translateY(-1px)" },
                                "&.Mui-disabled": { backgroundColor: "#cbd5e1", color: "white" }
                            }}
                        >
                            {loading ? <CircularProgress size={24} color="inherit" /> : <SaveIcon sx={{ fontSize: 24 }} />}
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Box>

            <Box sx={{ flexGrow: 1, overflowY: "auto", pr: 0.5, pb: 4 }}>
                {error && <Alert severity="error" icon={<ErrorIcon />} sx={{ mb: 2, borderRadius: "12px", border: "1px solid #fee2e2" }} onClose={() => setError(null)}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mb: 2, borderRadius: "12px", border: "1px solid #d1fae5" }}>{success}</Alert>}

                <Grid container spacing={4}>
                    {/* Left Column: Company Info */}
                    <Grid item xs={12} md={7.5}>
                        <Paper sx={{ p: 0, borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.01)", overflow: "hidden" }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 2, bgcolor: "#1a1a2e" }}>
                                <BusinessIcon sx={{ color: "white", fontSize: 22 }} />
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "white", textTransform: "uppercase", letterSpacing: "1px" }}>Company Information</Typography>
                            </Box>
                            <Box sx={{ p: 3 }}>
                                <Grid container spacing={3}>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth name="name" label={requiredLabel("Tenant Name")}
                                            value={formData.name} onChange={handleChange} sx={textFieldSx("name")}
                                            InputLabelProps={{ shrink: formData.name ? true : undefined }}
                                            error={Boolean(errors.name)} helperText={errors.name}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth name="phone" label="Phone Number"
                                            value={formData.phone} onChange={handleChange} sx={textFieldSx("phone")}
                                            InputLabelProps={{ shrink: formData.phone ? true : undefined }}
                                            error={Boolean(errors.phone)} helperText={errors.phone}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth name="description" label="Business Description"
                                            value={formData.description} onChange={handleChange} multiline rows={3}
                                            sx={{ ...textFieldSx("description"), "& .MuiOutlinedInput-root": { py: 1.5 } }}
                                            InputLabelProps={{ shrink: formData.description ? true : undefined }}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Box sx={{ p: 2, bgcolor: "#f1f5f9", borderRadius: "16px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                            <Box>
                                                <Typography sx={{ fontSize: "0.9rem", fontWeight: 700, color: "#1e293b" }}>Account Active</Typography>
                                                <Typography variant="caption" sx={{ color: "#64748b", fontSize: "0.75rem" }}>Control system access for this tenant</Typography>
                                            </Box>
                                            <Switch checked={formData.is_active} onChange={handleChange} name="is_active" size="small" color="primary" />
                                        </Box>
                                    </Grid>
                                </Grid>
                            </Box>
                        </Paper>
                    </Grid>

                    {/* Right Column: Admin & Security */}
                    <Grid item xs={12} md={4.5}>
                        <Stack spacing={4}>
                            <Paper sx={{ p: 0, borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.01)", overflow: "hidden" }}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 2, bgcolor: "#1a1a2e" }}>
                                    <PersonIcon sx={{ color: "white", fontSize: 22 }} />
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "white", textTransform: "uppercase", letterSpacing: "1px" }}>Administrator</Typography>
                                </Box>
                                <Box sx={{ p: 3 }}>
                                    <Stack spacing={3}>
                                        <TextField
                                            fullWidth name="owner_name" label={requiredLabel("Full Name")}
                                            value={formData.owner_name} onChange={handleChange} sx={textFieldSx("owner_name")}
                                            InputLabelProps={{ shrink: formData.owner_name ? true : undefined }}
                                            error={Boolean(errors.owner_name)} helperText={errors.owner_name}
                                        />
                                        <TextField
                                            fullWidth name="email" label={requiredLabel("Email Address")}
                                            value={formData.email} onChange={handleChange} disabled={isEditMode} sx={textFieldSx("email")}
                                            InputLabelProps={{ shrink: formData.email ? true : undefined }}
                                            error={Boolean(errors.email)} helperText={errors.email}
                                        />
                                    </Stack>
                                </Box>
                            </Paper>

                            {!isEditMode && (
                                <Paper sx={{ p: 0, borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.01)", overflow: "hidden" }}>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 2, bgcolor: "#1a1a2e" }}>
                                        <SecurityIcon sx={{ color: "white", fontSize: 22 }} />
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "white", textTransform: "uppercase", letterSpacing: "1px" }}>Security</Typography>
                                    </Box>
                                    <Box sx={{ p: 3 }}>
                                        <Stack spacing={3}>
                                            <TextField
                                                fullWidth name="admin_password" label={requiredLabel("Password")}
                                                type={showPassword ? "text" : "password"} value={formData.admin_password} onChange={handleChange} sx={textFieldSx("admin_password")}
                                                InputProps={{ endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowPassword(!showPassword)} size="small">{showPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment> }}
                                                InputLabelProps={{ shrink: formData.admin_password ? true : undefined }}
                                                error={Boolean(errors.admin_password)} helperText={errors.admin_password}
                                            />
                                            <TextField
                                                fullWidth name="confirm_password" label={requiredLabel("Confirm Password")}
                                                type={showConfirmPassword ? "text" : "password"} value={formData.confirm_password} onChange={handleChange} sx={textFieldSx("confirm_password")}
                                                InputProps={{ endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} size="small">{showConfirmPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment> }}
                                                InputLabelProps={{ shrink: formData.confirm_password ? true : undefined }}
                                                error={Boolean(errors.confirm_password)} helperText={errors.confirm_password}
                                            />
                                        </Stack>
                                    </Box>
                                </Paper>
                            )}
                        </Stack>
                    </Grid>
                </Grid>
            </Box>
        </Box>
    );
};

export default AddTenant;
