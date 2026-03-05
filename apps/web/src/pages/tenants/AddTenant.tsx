import { useState, useEffect, useCallback } from "react";
import {
    Box,
    Button,
    Paper,
    Typography,
    Grid,
    TextField,
    Alert,
    CircularProgress,
    IconButton,
    InputAdornment,
    Stack,
    Tooltip,
    Switch,
    Tabs,
    Tab,
    Divider,
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
    CloudUpload as UploadIcon,
    Delete as DeleteIcon,
} from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../../components/common";
import tenantService from "../../api/services/tenantService";
import { Link as LinkIcon } from "@mui/icons-material";

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
        // Branding
        logo_url: "",
        // Address
        address_line1: "",
        address_line2: "",
        city: "",
        state: "",
        pin_code: "",
    });
    const [logoTab, setLogoTab] = useState(0); // 0 for Upload, 1 for URL
    const [initialFormData, setInitialFormData] = useState<typeof formData | null>(null);

    // Load existing tenant when in edit mode
    const fetchTenant = useCallback(async () => {
        if (!id) return;
        try {
            setFetchLoading(true);
            const data = await tenantService.get(Number(id));
            const tenantData = {
                name: data.name || "",
                owner_name: data.owner_name || "",
                email: data.email || "",
                admin_password: "",
                confirm_password: "",
                phone: data.phone || "",
                description: data.description || "",
                is_active: data.is_active,
                // Branding & Address
                logo_url: data.logo_url || "",
                address_line1: data.address_line1 || "",
                address_line2: data.address_line2 || "",
                city: data.city || "",
                state: data.state || "",
                pin_code: data.pin_code || "",
            };
            setFormData(tenantData);
            setInitialFormData(tenantData);

            // If logo exists, detect if it's base64 or a standard URL to set the tab
            if (tenantData.logo_url) {
                if (tenantData.logo_url.startsWith('data:')) {
                    setLogoTab(0);
                } else {
                    setLogoTab(1);
                }
            }
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

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validation: Size < 2MB
        if (file.size > 2 * 1024 * 1024) {
            setError("Image size should be less than 2MB");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setFormData(prev => ({ ...prev, logo_url: reader.result as string }));
        };
        reader.readAsDataURL(file);
    };

    const handleClearLogo = () => {
        setFormData(prev => ({ ...prev, logo_url: "" }));
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
                    logo_url: formData.logo_url || null,
                    address_line1: formData.address_line1 || null,
                    address_line2: formData.address_line2 || null,
                    city: formData.city || null,
                    state: formData.state || null,
                    pin_code: formData.pin_code || null,
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
                    logo_url: formData.logo_url || null,
                    address_line1: formData.address_line1 || null,
                    address_line2: formData.address_line2 || null,
                    city: formData.city || null,
                    state: formData.state || null,
                    pin_code: formData.pin_code || null,
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

    const isDirty = initialFormData ? JSON.stringify(formData) !== JSON.stringify(initialFormData) : true;

    const isFormValid =
        formData.name.length >= 3 &&
        Boolean(formData.owner_name) &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) &&
        Object.values(errors).every(error => !error) &&
        (!isEditMode ? (formData.admin_password.length >= 8 && formData.confirm_password === formData.admin_password) : isDirty);

    if (fetchLoading) return <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}><CircularProgress /></Box>;

    return (
        <Box sx={{ px: { xs: 2, md: 4 }, pb: 2, backgroundColor: "#f8fafc", height: "100vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>

            {/* Header - Standardized using PageHeader */}
            <PageHeader
                onBack={() => navigate("/")}
                backIcon={<HomeIcon sx={{ color: "white", fontSize: 24 }} />}
                title={
                    <>
                        <Box component="span" onClick={() => navigate("/tenants")} sx={{ color: "#94a3b8", cursor: "pointer", "&:hover": { color: "#1a1a2e" } }}>Tenants</Box>
                        <Box component="span" sx={{ color: "#cbd5e1", mx: 1.5 }}>/</Box>
                        {isEditMode ? "Edit Tenant" : "Add Tenant"}
                    </>
                }
                actions={
                    <>
                        <Tooltip title="Cancel and Go Back">
                            <IconButton
                                onClick={() => navigate("/tenants")}
                                sx={{
                                    color: "#ef4444",
                                    backgroundColor: "#fee2e2",
                                    borderRadius: 1.2,
                                    width: 44,
                                    height: 44,
                                    "&:hover": {
                                        backgroundColor: "#fecaca",
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
                                disabled={loading}
                                sx={{
                                    backgroundColor: "#10b981",
                                    color: "white",
                                    borderRadius: 1.2,
                                    width: 44, height: 44,
                                    boxShadow: "0 4px 10px rgba(16, 185, 129, 0.2)",
                                    "&:hover": { backgroundColor: "#059669", transform: "translateY(-1px)" },
                                    "&.Mui-disabled": { backgroundColor: "#cbd5e1", color: "white" }
                                }}
                            >
                                {loading ? <CircularProgress size={24} color="inherit" /> : <SaveIcon sx={{ fontSize: 24 }} />}
                            </IconButton>
                        </Tooltip>
                    </>
                }
            />

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

                                    {/* Branding Section */}
                                    <Grid item xs={12}>
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 1.5, bgcolor: "#1a1a2e", borderRadius: "12px", mb: 0 }}>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "white", textTransform: "uppercase", letterSpacing: "1px", fontSize: "0.75rem" }}>Branding</Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Box sx={{
                                            p: 2,
                                            border: "2px dashed #e2e8f0",
                                            borderRadius: "16px",
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            gap: 2,
                                            bgcolor: "#f8fafc",
                                            transition: "all 0.2s ease-in-out",
                                            "&:hover": { borderColor: "#cbd5e1", bgcolor: "#f1f5f9" }
                                        }}>
                                            <Box sx={{ width: "100%", mb: 1 }}>
                                                <Tabs
                                                    value={logoTab}
                                                    onChange={(_, val) => {
                                                        setLogoTab(val);
                                                        // Clear logo when switching to avoid mismatched state
                                                        setFormData(prev => ({ ...prev, logo_url: "" }));
                                                    }}
                                                    variant="fullWidth"
                                                    sx={{
                                                        minHeight: 36,
                                                        "& .MuiTab-root": { py: 1, minHeight: 36, fontSize: "0.75rem", fontWeight: 700 },
                                                        "& .MuiTabs-indicator": { height: 3, borderRadius: "3px 3px 0 0", bgcolor: "#1a1a2e" },
                                                        borderBottom: "1px solid #e2e8f0"
                                                    }}
                                                >
                                                    <Tab icon={<UploadIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="UPLOAD FILE" />
                                                    <Tab icon={<LinkIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="LOGO URL" />
                                                </Tabs>
                                            </Box>

                                            {logoTab === 0 ? (
                                                <>
                                                    {formData.logo_url && formData.logo_url.startsWith('data:') ? (
                                                        <Box sx={{ position: "relative", display: "inline-block" }}>
                                                            <img
                                                                src={formData.logo_url}
                                                                alt="Logo Preview"
                                                                style={{ height: "80px", maxWidth: "200px", objectFit: "contain", borderRadius: "8px", border: "1px solid #e2e8f0" }}
                                                            />
                                                            <IconButton
                                                                size="small"
                                                                onClick={handleClearLogo}
                                                                sx={{
                                                                    position: "absolute",
                                                                    top: -8,
                                                                    right: -8,
                                                                    bgcolor: "#ef4444",
                                                                    color: "white",
                                                                    "&:hover": { bgcolor: "#dc2626" }
                                                                }}
                                                            >
                                                                <DeleteIcon sx={{ fontSize: 16 }} />
                                                            </IconButton>
                                                        </Box>
                                                    ) : (
                                                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 1 }}>
                                                            <UploadIcon sx={{ fontSize: 40, color: "#94a3b8", mb: 1 }} />
                                                            <Typography variant="body2" sx={{ fontWeight: 600, color: "#64748b" }}>
                                                                No Local File
                                                            </Typography>
                                                            <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                                                                PNG, JPG or WebP (Max 2MB)
                                                            </Typography>
                                                        </Box>
                                                    )}

                                                    <input
                                                        accept="image/*"
                                                        id="logo-upload-input"
                                                        type="file"
                                                        hidden
                                                        onChange={handleLogoUpload}
                                                    />
                                                    <label htmlFor="logo-upload-input">
                                                        <Box
                                                            component="span"
                                                            sx={{
                                                                px: 3, py: 1,
                                                                bgcolor: "#1a1a2e", borderRadius: "8px",
                                                                color: "white", fontSize: "0.875rem", fontWeight: 700,
                                                                cursor: "pointer", display: "inline-block",
                                                                transition: "all 0.2s",
                                                                "&:hover": { bgcolor: "#2d2d44", transform: "translateY(-1px)" }
                                                            }}
                                                        >
                                                            {(formData.logo_url && formData.logo_url.startsWith('data:')) ? "Change File" : "Choose File"}
                                                        </Box>
                                                    </label>
                                                </>
                                            ) : (
                                                <Box sx={{ width: "100%", display: "flex", flexDirection: "column", gap: 2, alignItems: "center" }}>
                                                    <TextField
                                                        fullWidth
                                                        name="logo_url"
                                                        label="Logo Image URL"
                                                        placeholder="https://example.com/logo.png"
                                                        value={formData.logo_url.startsWith('data:') ? "" : formData.logo_url}
                                                        onChange={handleChange}
                                                        sx={textFieldSx("logo_url")}
                                                        InputProps={{
                                                            startAdornment: (
                                                                <InputAdornment position="start">
                                                                    <LinkIcon sx={{ color: "#94a3b8" }} />
                                                                </InputAdornment>
                                                            ),
                                                            endAdornment: formData.logo_url && !formData.logo_url.startsWith('data:') && (
                                                                <InputAdornment position="end">
                                                                    <IconButton onClick={handleClearLogo} size="small" sx={{ color: "#ef4444" }}>
                                                                        <DeleteIcon sx={{ fontSize: 18 }} />
                                                                    </IconButton>
                                                                </InputAdornment>
                                                            )
                                                        }}
                                                    />
                                                    {formData.logo_url && !formData.logo_url.startsWith('data:') && (
                                                        <Box sx={{ position: "relative", display: "inline-block", mt: 1 }}>
                                                            <Box sx={{ p: 1, bgcolor: "white", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                                                                <img
                                                                    src={formData.logo_url}
                                                                    alt="URL Preview"
                                                                    style={{ height: "60px", maxWidth: "150px", objectFit: "contain" }}
                                                                    onError={(e) => {
                                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                                        setErrors(prev => ({ ...prev, logo_url: "Invalid or inaccessible image URL" }));
                                                                    }}
                                                                />
                                                            </Box>
                                                        </Box>
                                                    )}
                                                </Box>
                                            )}
                                        </Box>
                                    </Grid>

                                    {/* Address Section */}
                                    <Grid item xs={12}>
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 1.5, bgcolor: "#1a1a2e", borderRadius: "12px" }}>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "white", textTransform: "uppercase", letterSpacing: "1px", fontSize: "0.75rem" }}>Address Information</Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth name="address_line1" label="Address Line 1"
                                            placeholder="123 Main Street"
                                            value={formData.address_line1} onChange={handleChange} sx={textFieldSx("address_line1")}
                                            InputLabelProps={{ shrink: formData.address_line1 ? true : undefined }}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth name="address_line2" label="Address Line 2"
                                            placeholder="Suite 100, Building A"
                                            value={formData.address_line2} onChange={handleChange} sx={textFieldSx("address_line2")}
                                            InputLabelProps={{ shrink: formData.address_line2 ? true : undefined }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={5}>
                                        <TextField
                                            fullWidth name="city" label="City"
                                            placeholder="New York"
                                            value={formData.city} onChange={handleChange} sx={textFieldSx("city")}
                                            InputLabelProps={{ shrink: formData.city ? true : undefined }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={4}>
                                        <TextField
                                            fullWidth name="state" label="State"
                                            placeholder="NY"
                                            value={formData.state} onChange={handleChange} sx={textFieldSx("state")}
                                            InputLabelProps={{ shrink: formData.state ? true : undefined }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={3}>
                                        <TextField
                                            fullWidth name="pin_code" label="Pin Code"
                                            placeholder="10001"
                                            value={formData.pin_code} onChange={handleChange} sx={textFieldSx("pin_code")}
                                            InputLabelProps={{ shrink: formData.pin_code ? true : undefined }}
                                            inputProps={{ maxLength: 20 }}
                                        />
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
                                    <Box sx={{ mt: 4, pt: 3, borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", gap: 2 }}>
                                        <Button
                                            onClick={() => navigate("/tenants")}
                                            variant="text"
                                            sx={{
                                                borderRadius: "12px",
                                                px: 2,
                                                py: 1,
                                                color: "#ef4444",
                                                fontWeight: 800,
                                                fontSize: "1rem",
                                                textTransform: "none",
                                                "&:hover": { bgcolor: "rgba(239, 68, 68, 0.08)" }
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={handleSubmitAction}
                                            variant="text"
                                            disabled={loading}
                                            sx={{
                                                borderRadius: "12px",
                                                px: 2,
                                                py: 1,
                                                color: "#10b981",
                                                fontWeight: 800,
                                                fontSize: "1rem",
                                                textTransform: "none",
                                                "&:hover": { bgcolor: "rgba(16, 185, 129, 0.08)" },
                                                "&.Mui-disabled": { color: "#cbd5e1" }
                                            }}
                                        >
                                            {loading ? <CircularProgress size={20} color="inherit" /> : (isEditMode ? "Update" : "Save")}
                                        </Button>
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
