import { useState, useEffect, useCallback } from "react";
import {
    Box,
    Button,
    Paper,
    Typography,
    TextField,
    Alert,
    CircularProgress,
    IconButton,
    InputAdornment,
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
    Save as SaveIcon,
    Cancel as CancelIcon,
    CloudUpload as UploadIcon,
    Delete as DeleteIcon,
    Link as LinkIcon,
    LocationOn as LocationIcon,
} from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../../components/common";
import tenantService from "../../api/services/tenantService";

// ─── Section label ─────────────────────────────────────────────────────────────
const SectionLabel = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
        <Box sx={{ color: "#1a1a2e", display: "flex", alignItems: "center" }}>{icon}</Box>
        <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.6px" }}>
            {title}
        </Typography>
    </Box>
);

// ─── Field label ───────────────────────────────────────────────────────────────
const FieldLabel = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
    <Typography sx={{ fontSize: "0.73rem", fontWeight: 700, color: "#64748b", mb: 0.5, display: "flex", alignItems: "center", gap: 0.3 }}>
        {children}
        {required && <Box component="span" sx={{ color: "#ef4444", fontSize: "0.8rem", lineHeight: 1 }}>*</Box>}
    </Typography>
);

// ─── TextField sx ──────────────────────────────────────────────────────────────
const buildFieldSx = (hasError: boolean) => ({
    "& .MuiOutlinedInput-root": {
        borderRadius: "8px",
        bgcolor: "white",
        fontSize: "0.875rem",
        fontWeight: 500,
        "& fieldset": { borderColor: hasError ? "#ef4444" : "#e2e8f0", borderWidth: hasError ? "1.5px" : "1.2px" },
        "&:hover fieldset": { borderColor: hasError ? "#ef4444" : "#cbd5e1" },
        "&.Mui-focused": {
            "& fieldset": { borderColor: hasError ? "#ef4444" : "#1a1a2e", borderWidth: "1.8px" },
        },
        "& .MuiInputBase-input.Mui-disabled": { WebkitTextFillColor: "#94a3b8" },
    },
    "& .MuiFormHelperText-root": { fontSize: "0.7rem", mt: 0.3, ml: 0 },
});

// ─── AddTenant ─────────────────────────────────────────────────────────────────
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
    const [logoTab, setLogoTab] = useState(0);

    const [formData, setFormData] = useState({
        name: "", owner_name: "", email: "",
        admin_password: "", confirm_password: "",
        phone: "", description: "", is_active: true,
        logo_url: "",
        address_line1: "", address_line2: "", city: "", state: "", pin_code: "",
    });
    const [initialFormData, setInitialFormData] = useState<typeof formData | null>(null);

    const fetchTenant = useCallback(async () => {
        if (!id) return;
        try {
            setFetchLoading(true);
            const data = await tenantService.get(Number(id));
            const d = {
                name: data.name || "", owner_name: data.owner_name || "",
                email: data.email || "", admin_password: "", confirm_password: "",
                phone: data.phone || "", description: data.description || "",
                is_active: data.is_active, logo_url: data.logo_url || "",
                address_line1: data.address_line1 || "", address_line2: data.address_line2 || "",
                city: data.city || "", state: data.state || "", pin_code: data.pin_code || "",
            };
            setFormData(d);
            setInitialFormData(d);
            if (d.logo_url) setLogoTab(d.logo_url.startsWith("data:") ? 0 : 1);
        } catch (err: any) {
            setError(err?.message || "Failed to load tenant.");
        } finally {
            setFetchLoading(false);
        }
    }, [id]);

    useEffect(() => { if (isEditMode) fetchTenant(); }, [fetchTenant, isEditMode]);

    const validateField = (name: string, value: any) => {
        let e = "";
        if (name === "name") {
            if (!value) e = "Required.";
            else if (value.length < 3) e = "Min 3 characters.";
        } else if (name === "owner_name") {
            if (!value) e = "Required.";
        } else if (name === "email") {
            if (!value) e = "Required.";
            else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) e = "Invalid email.";
        } else if (name === "phone" && value) {
            if (!/^\d+$/.test(value)) e = "Numeric only.";
            else if (value.length < 10 || value.length > 15) e = "10–15 digits.";
        } else if (!isEditMode) {
            if (name === "admin_password") {
                if (!value) e = "Required.";
                else if (value.length < 8) e = "Min 8 characters.";
            } else if (name === "confirm_password") {
                if (!value) e = "Required.";
                else if (value !== formData.admin_password) e = "Passwords don't match.";
            }
        }
        return e;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, checked, type } = e.target;
        const v = type === "checkbox" || name === "is_active" ? checked : value;
        setFormData(prev => ({ ...prev, [name]: v }));
        setErrors(prev => ({ ...prev, [name]: validateField(name, v) }));
    };

    const validateForm = () => {
        const fields = ["name", "owner_name", "email", "phone"];
        if (!isEditMode) fields.push("admin_password", "confirm_password");
        const newErrors: Record<string, string> = {};
        fields.forEach(f => { const e = validateField(f, formData[f as keyof typeof formData]); if (e) newErrors[f] = e; });
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { setError("Image size should be less than 2MB"); return; }
        const reader = new FileReader();
        reader.onloadend = () => setFormData(prev => ({ ...prev, logo_url: reader.result as string }));
        reader.readAsDataURL(file);
    };

    const handleClearLogo = () => setFormData(prev => ({ ...prev, logo_url: "" }));

    const handleSubmit = async () => {
        if (!validateForm()) return;
        setLoading(true);
        setError(null);
        try {
            const common = {
                name: formData.name, owner_name: formData.owner_name,
                phone: formData.phone, description: formData.description,
                is_active: formData.is_active, logo_url: formData.logo_url || null,
                address_line1: formData.address_line1 || null, address_line2: formData.address_line2 || null,
                city: formData.city || null, state: formData.state || null, pin_code: formData.pin_code || null,
            };
            if (isEditMode && id) {
                await tenantService.update(Number(id), common);
                setSuccess("Tenant updated successfully!");
            } else {
                const r = await tenantService.provision({ ...common, email: formData.email, admin_password: formData.admin_password });
                setSuccess(r.message || "Tenant created successfully!");
            }
            setTimeout(() => navigate("/tenants"), 1000);
        } catch (err: any) {
            const msg = err?.message || "";
            if (msg.toLowerCase().includes("email already exists")) setErrors(p => ({ ...p, email: "Email already exists." }));
            setError(msg || (isEditMode ? "Failed to update tenant." : "Failed to provision tenant."));
        } finally {
            setLoading(false);
        }
    };

    if (fetchLoading) return (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
            <CircularProgress sx={{ color: "#1a1a2e" }} />
        </Box>
    );

    return (
        <Box sx={{
            px: { xs: 1.5, sm: 2, md: 3 },
            display: "flex",
            flexDirection: "column",
            height: "calc(100vh - 0px)",
            overflow: "hidden",
        }}>
            {/* ── Page Header ── */}
            <PageHeader
                onBack={() => navigate("/")}
                backIcon={<HomeIcon sx={{ color: "white", fontSize: 24 }} />}
                title={
                    <>
                        <Box component="span" onClick={() => navigate("/tenants")}
                            sx={{ color: "#94a3b8", cursor: "pointer", "&:hover": { color: "#1a1a2e" } }}>
                            Tenants
                        </Box>
                        <Box component="span" sx={{ color: "#cbd5e1", mx: 1.5 }}>/</Box>
                        {isEditMode ? "Edit Tenant" : "Add Tenant"}
                    </>
                }
                actions={
                    <>
                        <Tooltip title="Cancel">
                            <IconButton onClick={() => navigate("/tenants")}
                                sx={{ color: "#ef4444", backgroundColor: "#fee2e2", borderRadius: 1.2, width: 40, height: 40, "&:hover": { backgroundColor: "#fecaca" } }}>
                                <CancelIcon sx={{ fontSize: 22 }} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title={isEditMode ? "Update Tenant" : "Save Tenant"}>
                            <span>
                                <IconButton onClick={handleSubmit} disabled={loading}
                                    sx={{
                                        backgroundColor: "#10b981", color: "white", borderRadius: 1.2, width: 40, height: 40,
                                        "&:hover": { backgroundColor: "#059669" }, "&.Mui-disabled": { backgroundColor: "#cbd5e1", color: "white" }
                                    }}>
                                    {loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon sx={{ fontSize: 20 }} />}
                                </IconButton>
                            </span>
                        </Tooltip>
                    </>
                }
            />

            {/* Alerts */}
            {error && <Alert severity="error" icon={<ErrorIcon />} sx={{ mb: 1, borderRadius: "8px", py: 0.3 }} onClose={() => setError(null)}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 1, borderRadius: "8px", py: 0.3 }}>{success}</Alert>}

            {/* ── Scrollable form area ── */}
            <Box sx={{ flex: 1, overflowY: "auto", pb: 2, pr: 0.5 }}>
                <Paper elevation={0} sx={{ borderRadius: "10px", border: "1px solid #e2e8f0", bgcolor: "white", overflow: "hidden" }}>

                    {/* Dark header */}
                    <Box sx={{ py: 1, px: { xs: 2, md: 3 }, display: "flex", justifyContent: "space-between", alignItems: "center", bgcolor: "#1a1a2e" }}>
                        <Typography sx={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            {isEditMode ? "Edit Tenant Details" : "New Tenant Details"}
                        </Typography>
                        <Typography sx={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>
                            <Box component="span" sx={{ color: "#f87171" }}>*</Box> required fields
                        </Typography>
                    </Box>

                    {/* ── Two-column body ── */}
                    <Box sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                        gap: 0,
                    }}>
                        {/* ── LEFT COLUMN ── */}
                        <Box sx={{ borderRight: { md: "1px solid #f1f5f9" } }}>

                            {/* Company Info */}
                            <Box sx={{ px: { xs: 2, md: 2.5 }, pt: 2, pb: 1.5 }}>
                                <SectionLabel icon={<BusinessIcon sx={{ fontSize: 15 }} />} title="Company Information" />
                                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
                                    <Box>
                                        <FieldLabel required>Tenant Name</FieldLabel>
                                        <TextField fullWidth size="small" name="name" value={formData.name}
                                            onChange={handleChange} placeholder="Acme Corp"
                                            error={Boolean(errors.name)} helperText={errors.name}
                                            inputProps={{ maxLength: 255 }} sx={buildFieldSx(Boolean(errors.name))} />
                                    </Box>
                                    <Box>
                                        <FieldLabel>Phone</FieldLabel>
                                        <TextField fullWidth size="small" name="phone" value={formData.phone}
                                            onChange={handleChange} placeholder="1234567890"
                                            error={Boolean(errors.phone)} helperText={errors.phone}
                                            inputProps={{ maxLength: 15 }} sx={buildFieldSx(Boolean(errors.phone))} />
                                    </Box>
                                    <Box sx={{ gridColumn: "1 / 3" }}>
                                        <FieldLabel>Description</FieldLabel>
                                        <TextField fullWidth size="small" name="description" value={formData.description}
                                            onChange={handleChange} placeholder="Brief business description…"
                                            multiline rows={2} sx={buildFieldSx(false)} />
                                    </Box>
                                    <Box sx={{
                                        gridColumn: "1 / 3",
                                        display: "flex", alignItems: "center", justifyContent: "space-between",
                                        px: 1.5, py: 0.8, borderRadius: "8px", border: "1.2px solid #e2e8f0", bgcolor: "#f8fafc",
                                    }}>
                                        <Box>
                                            <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: "#1e293b" }}>Account Active</Typography>
                                            <Typography sx={{ fontSize: "0.7rem", color: "#64748b" }}>Control system access</Typography>
                                        </Box>
                                        <Switch checked={formData.is_active} onChange={handleChange} name="is_active" size="small"
                                            sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: "#10b981" }, "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: "#10b981" } }} />
                                    </Box>
                                </Box>
                            </Box>

                            <Divider sx={{ borderColor: "#f1f5f9" }} />

                            {/* Address */}
                            <Box sx={{ px: { xs: 2, md: 2.5 }, pt: 1.5, pb: 2 }}>
                                <SectionLabel icon={<LocationIcon sx={{ fontSize: 15 }} />} title="Address" />
                                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
                                    <Box sx={{ gridColumn: "1 / 3" }}>
                                        <FieldLabel>Address Line 1</FieldLabel>
                                        <TextField fullWidth size="small" name="address_line1" value={formData.address_line1}
                                            onChange={handleChange} placeholder="123 Main Street" sx={buildFieldSx(false)} />
                                    </Box>
                                    <Box sx={{ gridColumn: "1 / 3" }}>
                                        <FieldLabel>Address Line 2</FieldLabel>
                                        <TextField fullWidth size="small" name="address_line2" value={formData.address_line2}
                                            onChange={handleChange} placeholder="Suite 100, Building A" sx={buildFieldSx(false)} />
                                    </Box>
                                    <Box>
                                        <FieldLabel>City</FieldLabel>
                                        <TextField fullWidth size="small" name="city" value={formData.city}
                                            onChange={handleChange} placeholder="Mumbai" sx={buildFieldSx(false)} />
                                    </Box>
                                    <Box>
                                        <FieldLabel>State</FieldLabel>
                                        <TextField fullWidth size="small" name="state" value={formData.state}
                                            onChange={handleChange} placeholder="Maharashtra" sx={buildFieldSx(false)} />
                                    </Box>
                                    <Box>
                                        <FieldLabel>Pin Code</FieldLabel>
                                        <TextField fullWidth size="small" name="pin_code" value={formData.pin_code}
                                            onChange={handleChange} placeholder="400001"
                                            inputProps={{ maxLength: 20 }} sx={buildFieldSx(false)} />
                                    </Box>
                                </Box>
                            </Box>
                        </Box>

                        {/* ── RIGHT COLUMN ── */}
                        <Box>
                            {/* Administrator */}
                            <Box sx={{ px: { xs: 2, md: 2.5 }, pt: 2, pb: 1.5 }}>
                                <SectionLabel icon={<PersonIcon sx={{ fontSize: 15 }} />} title="Administrator" />
                                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                                    <Box>
                                        <FieldLabel required>Full Name</FieldLabel>
                                        <TextField fullWidth size="small" name="owner_name" value={formData.owner_name}
                                            onChange={handleChange} placeholder="John Doe"
                                            error={Boolean(errors.owner_name)} helperText={errors.owner_name}
                                            sx={buildFieldSx(Boolean(errors.owner_name))} />
                                    </Box>
                                    <Box>
                                        <FieldLabel required>Email Address</FieldLabel>
                                        <TextField fullWidth size="small" name="email" value={formData.email}
                                            onChange={handleChange} placeholder="admin@example.com"
                                            disabled={isEditMode}
                                            error={Boolean(errors.email)}
                                            helperText={isEditMode ? "Email cannot be changed" : errors.email}
                                            sx={buildFieldSx(Boolean(errors.email))} />
                                    </Box>
                                </Box>
                            </Box>

                            {/* Security — add mode only */}
                            {!isEditMode && (
                                <>
                                    <Divider sx={{ borderColor: "#f1f5f9" }} />
                                    <Box sx={{ px: { xs: 2, md: 2.5 }, pt: 1.5, pb: 1.5 }}>
                                        <SectionLabel icon={<SecurityIcon sx={{ fontSize: 15 }} />} title="Security" />
                                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                                            <Box>
                                                <FieldLabel required>Password</FieldLabel>
                                                <TextField fullWidth size="small" name="admin_password"
                                                    type={showPassword ? "text" : "password"}
                                                    value={formData.admin_password} onChange={handleChange}
                                                    placeholder="Min 8 characters"
                                                    error={Boolean(errors.admin_password)} helperText={errors.admin_password}
                                                    InputProps={{
                                                        endAdornment: (
                                                            <InputAdornment position="end">
                                                                <IconButton onClick={() => setShowPassword(!showPassword)} size="small" edge="end">
                                                                    {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                                                </IconButton>
                                                            </InputAdornment>
                                                        )
                                                    }}
                                                    sx={buildFieldSx(Boolean(errors.admin_password))} />
                                            </Box>
                                            <Box>
                                                <FieldLabel required>Confirm Password</FieldLabel>
                                                <TextField fullWidth size="small" name="confirm_password"
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    value={formData.confirm_password} onChange={handleChange}
                                                    placeholder="Re-enter password"
                                                    error={Boolean(errors.confirm_password)} helperText={errors.confirm_password}
                                                    InputProps={{
                                                        endAdornment: (
                                                            <InputAdornment position="end">
                                                                <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} size="small" edge="end">
                                                                    {showConfirmPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                                                </IconButton>
                                                            </InputAdornment>
                                                        )
                                                    }}
                                                    sx={buildFieldSx(Boolean(errors.confirm_password))} />
                                            </Box>
                                        </Box>
                                    </Box>
                                </>
                            )}

                            <Divider sx={{ borderColor: "#f1f5f9" }} />

                            {/* Branding */}
                            <Box sx={{ px: { xs: 2, md: 2.5 }, pt: 1.5, pb: 2 }}>
                                <SectionLabel icon={<UploadIcon sx={{ fontSize: 15 }} />} title="Branding / Logo" />

                                <Tabs value={logoTab}
                                    onChange={(_, v) => { setLogoTab(v); setFormData(p => ({ ...p, logo_url: "" })); }}
                                    sx={{
                                        mb: 1.5, minHeight: 32,
                                        "& .MuiTab-root": { py: 0.5, minHeight: 32, fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase" },
                                        "& .MuiTabs-indicator": { height: 2, bgcolor: "#1a1a2e" },
                                        borderBottom: "1px solid #e2e8f0",
                                    }}
                                >
                                    <Tab icon={<UploadIcon sx={{ fontSize: 14 }} />} iconPosition="start" label="Upload" />
                                    <Tab icon={<LinkIcon sx={{ fontSize: 14 }} />} iconPosition="start" label="URL" />
                                </Tabs>

                                {logoTab === 0 ? (
                                    <Box sx={{
                                        p: 2, border: "2px dashed #e2e8f0", borderRadius: "8px",
                                        display: "flex", flexDirection: "column", alignItems: "center", gap: 1.2,
                                        bgcolor: "#f8fafc", "&:hover": { borderColor: "#cbd5e1" },
                                    }}>
                                        {formData.logo_url && formData.logo_url.startsWith("data:") ? (
                                            <Box sx={{ position: "relative", display: "inline-block" }}>
                                                <img src={formData.logo_url} alt="Logo Preview"
                                                    style={{ height: 56, maxWidth: 160, objectFit: "contain", borderRadius: 6, border: "1px solid #e2e8f0" }} />
                                                <IconButton size="small" onClick={handleClearLogo}
                                                    sx={{ position: "absolute", top: -7, right: -7, bgcolor: "#ef4444", color: "white", width: 20, height: 20, "&:hover": { bgcolor: "#dc2626" } }}>
                                                    <DeleteIcon sx={{ fontSize: 12 }} />
                                                </IconButton>
                                            </Box>
                                        ) : (
                                            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                                <UploadIcon sx={{ fontSize: 28, color: "#94a3b8", mb: 0.3 }} />
                                                <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, color: "#64748b" }}>No file selected</Typography>
                                                <Typography sx={{ fontSize: "0.7rem", color: "#94a3b8" }}>PNG, JPG or WebP · max 2 MB</Typography>
                                            </Box>
                                        )}
                                        <input accept="image/*" id="logo-upload-input" type="file" hidden onChange={handleLogoUpload} />
                                        <label htmlFor="logo-upload-input">
                                            <Box component="span" sx={{
                                                px: 2.5, py: 0.7, bgcolor: "#1a1a2e", borderRadius: "7px",
                                                color: "white", fontSize: "0.78rem", fontWeight: 700,
                                                cursor: "pointer", display: "inline-block",
                                                "&:hover": { bgcolor: "#2d2d44" },
                                            }}>
                                                {formData.logo_url && formData.logo_url.startsWith("data:") ? "Change File" : "Choose File"}
                                            </Box>
                                        </label>
                                    </Box>
                                ) : (
                                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.2 }}>
                                        <Box>
                                            <FieldLabel>Logo URL</FieldLabel>
                                            <TextField fullWidth size="small" name="logo_url"
                                                value={formData.logo_url.startsWith("data:") ? "" : formData.logo_url}
                                                onChange={handleChange} placeholder="https://example.com/logo.png"
                                                error={Boolean(errors.logo_url)} helperText={errors.logo_url}
                                                InputProps={{
                                                    startAdornment: <InputAdornment position="start"><LinkIcon sx={{ color: "#94a3b8", fontSize: 16 }} /></InputAdornment>,
                                                    endAdornment: formData.logo_url && !formData.logo_url.startsWith("data:") ? (
                                                        <InputAdornment position="end">
                                                            <IconButton onClick={handleClearLogo} size="small" sx={{ color: "#ef4444" }}>
                                                                <DeleteIcon sx={{ fontSize: 15 }} />
                                                            </IconButton>
                                                        </InputAdornment>
                                                    ) : undefined,
                                                }}
                                                sx={buildFieldSx(Boolean(errors.logo_url))} />
                                        </Box>
                                        {formData.logo_url && !formData.logo_url.startsWith("data:") && (
                                            <Box sx={{ p: 1.2, bgcolor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", display: "inline-flex" }}>
                                                <img src={formData.logo_url} alt="URL Preview"
                                                    style={{ height: 44, maxWidth: 120, objectFit: "contain" }}
                                                    onError={e => {
                                                        (e.target as HTMLImageElement).style.display = "none";
                                                        setErrors(p => ({ ...p, logo_url: "Invalid or inaccessible image URL" }));
                                                    }} />
                                            </Box>
                                        )}
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    </Box>

                    <Box sx={{
                        px: { xs: 2, md: 3 }, py: 1.2,
                        borderTop: "1px solid #f1f5f9", bgcolor: "#fcfdfe",
                        display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 0,
                    }}>
                        <Button
                            onClick={() => navigate("/tenants")}
                            sx={{
                                color: "#ef4444",
                                backgroundColor: "transparent",
                                fontWeight: "bold",
                                fontSize: "1.1rem",
                                px: 4,
                                borderRadius: 0,
                                minWidth: 120,
                                boxShadow: "none",
                                border: "none",
                                textTransform: "none",
                                "&:hover": { backgroundColor: "transparent", textDecoration: "underline" },
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={loading ? undefined : handleSubmit}
                            disabled={loading}
                            sx={{
                                color: "#43a047",
                                backgroundColor: "transparent",
                                fontWeight: "bold",
                                fontSize: "1.1rem",
                                px: 4,
                                borderRadius: 0,
                                minWidth: 120,
                                boxShadow: "none",
                                border: "none",
                                textTransform: "none",
                                "&:hover": { backgroundColor: "transparent", textDecoration: "underline" },
                                "&.Mui-disabled": { color: "#94a3b8" },
                            }}
                        >
                            {loading ? "Saving…" : isEditMode ? "Update" : "Save"}
                        </Button>
                    </Box>
                </Paper>
            </Box>
        </Box>
    );
};

export default AddTenant;
