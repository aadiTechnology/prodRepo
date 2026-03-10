import { useState, useEffect, useCallback } from "react";
import {
    Box,
    Paper,
    Typography,
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
import type { Theme } from "@mui/material/styles";
import { Button, TextField, Select, MenuItem } from "../../components/primitives";
import { SaveButton, CancelButton, EmailInput, PhoneInput, PasswordInput } from "../../components/semantic";
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
import themeTemplateService from "../../api/services/themeTemplateService";
import { ListPageLayout, FormSectionLabel, FieldLabel } from "../../components/reusable";
import type { ThemeTemplate } from "../../types/themeTemplate";

// ─── TextField sx (theme-driven) ───────────────────────────────────────────────
const buildFieldSx = (hasError: boolean) => (theme: Theme) => ({
    "& .MuiOutlinedInput-root": {
        borderRadius: 1,
        bgcolor: theme.palette.background.paper,
        fontSize: "0.875rem",
        fontWeight: 500,
        "& fieldset": { borderColor: hasError ? theme.palette.error.main : theme.palette.divider, borderWidth: hasError ? "1.5px" : "1.2px" },
        "&:hover fieldset": { borderColor: hasError ? theme.palette.error.main : theme.palette.grey[400] },
        "&.Mui-focused": {
            "& fieldset": { borderColor: hasError ? theme.palette.error.main : theme.palette.primary.main, borderWidth: "1.8px" },
        },
        "& .MuiInputBase-input.Mui-disabled": { WebkitTextFillColor: theme.palette.grey[500] },
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
        theme_template_id: null as number | null,
        address_line1: "", address_line2: "", city: "", state: "", pin_code: "",
    });
    const [initialFormData, setInitialFormData] = useState<typeof formData | null>(null);
    const [templates, setTemplates] = useState<ThemeTemplate[]>([]);

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
                theme_template_id: data.theme_template_id ?? null,
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

    useEffect(() => {
        themeTemplateService.list({ page_size: 500 }).then(r => setTemplates(r.items || [])).catch(() => setTemplates([]));
    }, []);

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
                theme_template_id: formData.theme_template_id ?? null,
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
        <ListPageLayout
            pageBackground={true}
            contentPaddingSize="none"
            header={
                <>
                    <PageHeader
                        onBack={() => navigate("/")}
                        backIcon={<HomeIcon sx={{ color: "white", fontSize: 24 }} />}
                        title={
                            <>
                                <Box component="span" onClick={() => navigate("/tenants")}
                                    sx={(theme) => ({ color: theme.palette.text.secondary, cursor: "pointer", "&:hover": { color: theme.palette.text.primary } })}>
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
                                        sx={(theme) => ({ color: theme.palette.error.main, backgroundColor: theme.palette.error.light, borderRadius: 1.2, width: 40, height: 40, "&:hover": { backgroundColor: theme.palette.error.light } })}>
                                        <CancelIcon sx={{ fontSize: 22 }} />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title={isEditMode ? "Update Tenant" : "Save Tenant"}>
                                    <span>
                                        <IconButton onClick={handleSubmit} disabled={loading}
                                            sx={(theme) => ({
                                                backgroundColor: theme.palette.success.main, color: theme.palette.success.contrastText, borderRadius: 1.2, width: 40, height: 40,
                                                "&:hover": { backgroundColor: theme.palette.success.dark }, "&.Mui-disabled": { backgroundColor: theme.palette.grey[400], color: "white" }
                                            })}>
                                            {loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon sx={{ fontSize: 20 }} />}
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            </>
                        }
                    />
                    {error && <Alert severity="error" icon={<ErrorIcon />} sx={{ mb: 1, borderRadius: "8px", py: 0.3 }} onClose={() => setError(null)}>{error}</Alert>}
                    {success && <Alert severity="success" sx={{ mb: 1, borderRadius: "8px", py: 0.3 }}>{success}</Alert>}
                </>
            }
        >
            <Box sx={{ flex: 1, overflowY: "auto", pb: 2, pr: 0.5 }}>
                <Paper elevation={0} sx={(theme) => ({ borderRadius: 1.25, border: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.background.paper, overflow: "hidden" })}>

                    {/* Dark header */}
                    <Box sx={{ py: 1, px: { xs: 2, md: 3 }, display: "flex", justifyContent: "space-between", alignItems: "center", bgcolor: "#1a1a2e" }}>
                        <Typography sx={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            {isEditMode ? "Edit Tenant Details" : "New Tenant Details"}
                        </Typography>
                        <Typography sx={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>
                            <Box component="span" sx={(theme) => ({ color: theme.palette.error.light })}>*</Box> required fields
                        </Typography>
                    </Box>

                    {/* ── Two-column body ── */}
                    <Box sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                        gap: 0,
                    }}>
                        {/* ── LEFT COLUMN ── */}
                        <Box sx={(theme) => ({ borderRight: { md: `1px solid ${theme.palette.divider}` } })}>

                            {/* Company Info */}
                            <Box sx={{ px: { xs: 2, md: 2.5 }, pt: 2, pb: 1.5 }}>
                                <FormSectionLabel icon={<BusinessIcon sx={{ fontSize: 15 }} />} title="Company Information" />
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
                                        <PhoneInput fullWidth size="small" name="phone" value={formData.phone}
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
                                    <Box sx={(theme) => ({
                                        gridColumn: "1 / 3",
                                        display: "flex", alignItems: "center", justifyContent: "space-between",
                                        px: 1.5, py: 0.8, borderRadius: 1, border: `1.2px solid ${theme.palette.divider}`, bgcolor: theme.palette.grey[50],
                                    })}>
                                        <Box>
                                            <Typography sx={(theme) => ({ fontSize: "0.82rem", fontWeight: 700, color: theme.palette.text.primary })}>Account Active</Typography>
                                            <Typography sx={(theme) => ({ fontSize: "0.7rem", color: theme.palette.text.secondary })}>Control system access</Typography>
                                        </Box>
                                        <Switch checked={formData.is_active} onChange={handleChange} name="is_active" size="small"
                                            sx={(theme) => ({ "& .MuiSwitch-switchBase.Mui-checked": { color: theme.palette.success.main }, "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: theme.palette.success.main } })} />
                                    </Box>
                                </Box>
                            </Box>

                            <Divider sx={(theme) => ({ borderColor: theme.palette.divider })} />

                            {/* Address */}
                            <Box sx={{ px: { xs: 2, md: 2.5 }, pt: 1.5, pb: 2 }}>
                                <FormSectionLabel icon={<LocationIcon sx={{ fontSize: 15 }} />} title="Address" />
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
                                <FormSectionLabel icon={<PersonIcon sx={{ fontSize: 15 }} />} title="Administrator" />
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
                                        <EmailInput fullWidth size="small" name="email" value={formData.email}
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
                                    <Divider sx={(theme) => ({ borderColor: theme.palette.divider })} />
                                    <Box sx={{ px: { xs: 2, md: 2.5 }, pt: 1.5, pb: 1.5 }}>
                                        <FormSectionLabel icon={<SecurityIcon sx={{ fontSize: 15 }} />} title="Security" />
                                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                                            <Box>
                                                <FieldLabel required>Password</FieldLabel>
                                                <PasswordInput fullWidth size="small" name="admin_password"
                                                    value={formData.admin_password} onChange={handleChange}
                                                    placeholder="Min 8 characters"
                                                    error={Boolean(errors.admin_password)} helperText={errors.admin_password}
                                                    sx={buildFieldSx(Boolean(errors.admin_password))} />
                                            </Box>
                                            <Box>
                                                <FieldLabel required>Confirm Password</FieldLabel>
                                                <PasswordInput fullWidth size="small" name="confirm_password"
                                                    label="Confirm Password"
                                                    value={formData.confirm_password} onChange={handleChange}
                                                    placeholder="Re-enter password"
                                                    error={Boolean(errors.confirm_password)} helperText={errors.confirm_password}
                                                    sx={buildFieldSx(Boolean(errors.confirm_password))} />
                                            </Box>
                                        </Box>
                                    </Box>
                                </>
                            )}

                            <Divider sx={(theme) => ({ borderColor: theme.palette.divider })} />

                            {/* Branding */}
                            <Box sx={{ px: { xs: 2, md: 2.5 }, pt: 1.5, pb: 2 }}>
                                <FormSectionLabel icon={<UploadIcon sx={{ fontSize: 15 }} />} title="Branding / Logo" />

                                <Tabs value={logoTab}
                                    onChange={(_, v) => { setLogoTab(v); setFormData(p => ({ ...p, logo_url: "" })); }}
                                    sx={(theme) => ({
                                        mb: 1.5, minHeight: 32,
                                        "& .MuiTab-root": { py: 0.5, minHeight: 32, fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase" },
                                        "& .MuiTabs-indicator": { height: 2, bgcolor: theme.palette.primary.main },
                                        borderBottom: `1px solid ${theme.palette.divider}`,
                                    })}
                                >
                                    <Tab icon={<UploadIcon sx={{ fontSize: 14 }} />} iconPosition="start" label="Upload" />
                                    <Tab icon={<LinkIcon sx={{ fontSize: 14 }} />} iconPosition="start" label="URL" />
                                </Tabs>

                                {logoTab === 0 ? (
                                    <Box sx={{
                                        p: 2, border: (t) => `2px dashed ${t.palette.divider}`, borderRadius: 1,
                                        display: "flex", flexDirection: "column", alignItems: "center", gap: 1.2,
                                        bgcolor: "grey.50", "&:hover": { borderColor: "grey.400" },
                                    }}>
                                        {formData.logo_url && formData.logo_url.startsWith("data:") ? (
                                            <Box sx={{ position: "relative", display: "inline-block" }}>
                                                <img src={formData.logo_url} alt="Logo Preview"
                                                    style={{ height: 56, maxWidth: 160, objectFit: "contain", borderRadius: 6 }} />
                                                <IconButton size="small" onClick={handleClearLogo}
                                                    sx={(theme) => ({ position: "absolute", top: -7, right: -7, bgcolor: theme.palette.error.main, color: theme.palette.error.contrastText, width: 20, height: 20, "&:hover": { bgcolor: theme.palette.error.dark } })}>
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
                                                px: 2.5, py: 0.7, bgcolor: "grey.800", borderRadius: "7px",
                                                color: "white", fontSize: "0.78rem", fontWeight: 700,
                                                cursor: "pointer", display: "inline-block",
                                                "&:hover": { bgcolor: "grey.700" },
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
                                                    startAdornment: <InputAdornment position="start"><LinkIcon sx={(theme) => ({ color: theme.palette.text.secondary, fontSize: 16 })} /></InputAdornment>,
                                                    endAdornment: formData.logo_url && !formData.logo_url.startsWith("data:") ? (
                                                        <InputAdornment position="end">
                                                            <IconButton onClick={handleClearLogo} size="small" sx={(theme) => ({ color: theme.palette.error.main })}>
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

                                <Box sx={{ mt: 2 }}>
                                    <FieldLabel>Theme Template</FieldLabel>
                                    <Select
                                        fullWidth
                                        size="small"
                                        label="Template (tenant branding)"
                                        value={formData.theme_template_id ?? ""}
                                        onChange={(e) => setFormData(prev => ({ ...prev, theme_template_id: e.target.value === "" ? null : Number(e.target.value) }))}
                                        sx={(theme) => ({ "& .MuiOutlinedInput-root": { borderRadius: 1, bgcolor: theme.palette.background.paper } })}
                                    >
                                        <MenuItem value="">None</MenuItem>
                                        {templates.map(t => (
                                            <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                                        ))}
                                    </Select>
                                    <Typography variant="caption" sx={(theme) => ({ color: theme.palette.text.secondary, display: "block", mt: 0.5 })}>
                                        When set, this template is applied at login for this tenant.
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>
                    </Box>

                    <Box sx={(theme) => ({
                        px: { xs: 2, md: 3 }, py: 1.2,
                        borderTop: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.grey[50],
                        display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 0,
                    })}>
                        <CancelButton
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
                        </CancelButton>
                        <SaveButton
                            onClick={loading ? undefined : handleSubmit}
                            disabled={loading}
                            loading={loading}
                            sx={(theme) => ({
                                color: theme.palette.success.main,
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
                                "&.Mui-disabled": { color: theme.palette.text.secondary },
                            })}
                        >
                            {loading ? "Saving…" : isEditMode ? "Update" : "Save"}
                        </SaveButton>
                    </Box>
                </Paper>
            </Box>
        </ListPageLayout>
    );
};

export default AddTenant;
