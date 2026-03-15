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
    alpha,
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
import { PageHeader } from "../../components/layout";
import tenantService from "../../api/services/tenantService";
import themeTemplateService from "../../api/services/themeTemplateService";
import { ListPageLayout } from "../../components/reusable";
import { AppCard } from "../../components/primitives";
import { colorTokens } from "../../tokens/colors";
import type { ThemeTemplate } from "../../types/themeTemplate";

// ─── TextField sx (theme-driven) ───────────────────────────────────────────────
const buildFieldSx = (hasError: boolean) => (theme: Theme) => ({
    "& .MuiOutlinedInput-root": {
        borderRadius: "12px",
        bgcolor: "#ffffff",
        fontSize: "0.875rem",
        fontWeight: 500,
        transition: "all 0.2s ease-in-out",
        "& fieldset": { 
            borderColor: hasError ? colorTokens.preschool.coral.main : colorTokens.border.subtle, 
            borderWidth: "1.5px" 
        },
        "&:hover fieldset": { 
            borderColor: hasError ? colorTokens.preschool.coral.main : colorTokens.preschool.turquoise.main 
        },
        "&.Mui-focused": {
            boxShadow: `0 0 0 3px ${alpha(colorTokens.preschool.turquoise.main, 0.1)}`,
            "& fieldset": { 
                borderColor: colorTokens.preschool.turquoise.main, 
                borderWidth: "2px" 
            },
        },
        "& .MuiInputBase-input.Mui-disabled": { WebkitTextFillColor: theme.palette.grey[500] },
    },
    "& .MuiInputLabel-root": {
        fontSize: "0.875rem",
        fontWeight: 500,
        color: alpha(colorTokens.text.primary, 0.6),
        "&.Mui-focused": {
            color: colorTokens.preschool.turquoise.dark,
        },
    },
    "& .MuiFormLabel-asterisk": {
        color: `${colorTokens.preschool.coral.main} !important`,
    },
    "& .MuiFormHelperText-root": { fontSize: "0.75rem", mt: 0.5, ml: 1, fontWeight: 500 },
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
        themeTemplateService.list({ page_size: 500 }).then((r: any) => setTemplates(r.items || [])).catch(() => setTemplates([]));
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
            console.error("Provisioning error:", err);
            const errorData = err?.response?.data;
            let msg = err?.message || "";

            // Handle FastAPI validation error list
            if (errorData?.detail && Array.isArray(errorData.detail)) {
                const newFieldErrors: Record<string, string> = {};
                errorData.detail.forEach((issue: any) => {
                    const field = issue.loc?.[issue.loc.length - 1];
                    if (field) newFieldErrors[field] = issue.msg;
                });
                if (Object.keys(newFieldErrors).length > 0) {
                    setErrors(p => ({ ...p, ...newFieldErrors }));
                    msg = "Please fix the highlighted errors.";
                } else {
                    msg = errorData.detail[0]?.msg || msg;
                }
            } else if (typeof errorData?.detail === "string") {
                msg = errorData.detail;
            }

            if (msg.toLowerCase().includes("email already exists")) {
                setErrors(p => ({ ...p, email: "Email already exists." }));
            }
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
                <Box sx={{ mb: 2 }}>
                    <PageHeader
                        onBack={() => navigate("/tenants")}
                        title={
                            <>
                                <Box component="span" onClick={() => navigate("/tenants")}
                                    sx={(theme) => ({
                                        color: alpha(theme.palette.text.primary, 0.6),
                                        cursor: "pointer",
                                        "&:hover": { color: theme.palette.text.primary }
                                    })}>
                                    Tenants
                                </Box>
                                <Box component="span" sx={{ color: "#cbd5e1", mx: 1.5 }}>/</Box>
                                {isEditMode ? "Edit Tenant" : "Add Tenant"}
                            </>
                        }
                        actions={
                            <Box sx={{ display: "flex", gap: 1.5 }}>
                                <Tooltip title="Discard Changes">
                                    <IconButton onClick={() => navigate("/tenants")}
                                        sx={{
                                            color: colorTokens.preschool.coral.main,
                                            backgroundColor: alpha(colorTokens.preschool.coral.main, 0.08),
                                            borderRadius: "12px",
                                            width: 44, height: 44,
                                            border: `1.5px solid ${alpha(colorTokens.preschool.coral.main, 0.2)}`,
                                            "&:hover": { backgroundColor: alpha(colorTokens.preschool.coral.main, 0.15) }
                                        }}>
                                        <CancelIcon sx={{ fontSize: 22 }} />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title={isEditMode ? "Update Changes" : "Finish & Create"}>
                                    <IconButton onClick={handleSubmit} disabled={loading}
                                        sx={{
                                            background: `linear-gradient(135deg, ${colorTokens.preschool.turquoise.main} 0%, ${colorTokens.primary.main} 100%)`,
                                            color: "white",
                                            borderRadius: "12px",
                                            width: 44, height: 44,
                                            boxShadow: `0 4px 12px ${alpha(colorTokens.preschool.turquoise.main, 0.3)}`,
                                            "&:hover": { transform: "translateY(-2px)", boxShadow: `0 6px 16px ${alpha(colorTokens.preschool.turquoise.main, 0.4)}` },
                                            "&.Mui-disabled": { background: "#e2e8f0", color: "#94a3b8" }
                                        }}>
                                        {loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon sx={{ fontSize: 20 }} />}
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        }
                    />
                    {error && <Alert severity="error" variant="filled" sx={{ mt: 2, borderRadius: "12px" }} onClose={() => setError(null)}>{error}</Alert>}
                    {success && <Alert severity="success" variant="filled" sx={{ mt: 2, borderRadius: "12px" }}>{success}</Alert>}
                </Box>
            }
        >
            <AppCard sx={{ 
                p: 0, 
                overflow: "hidden", 
                border: `1px solid ${colorTokens.border.default}`,
                display: "flex", 
                flexDirection: "column",
                height: "calc(100vh - 180px)", // Adjusted for header and spacing
            }}>
                {/* Turquoise Header */}
                <Box sx={{ 
                    py: 1.5, px: 3, 
                    background: `linear-gradient(90deg, ${colorTokens.preschool.turquoise.main} 0%, ${colorTokens.primary.main} 100%)`,
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    flexShrink: 0
                }}>
                    <Typography sx={{ fontSize: "0.85rem", color: "white", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px" }}>
                        {isEditMode ? "Modify Tenant Settings" : "Create New Tenant"}
                    </Typography>
                    <Typography sx={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>
                        <Box component="span" sx={{ color: colorTokens.preschool.coral.main, mr: 0.5 }}>*</Box> Mandatory Fields
                    </Typography>
                </Box>

                {/* Scrollable Content Area */}
                <Box sx={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
                    <Box sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                        gap: 0,
                    }}>
                    {/* ── LEFT COLUMN ── */}
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, p: { xs: 2, md: 4 }, borderRight: { md: `1px solid ${colorTokens.border.subtle}` } }}>
                        <TextField 
                            label="Tenant Name" required fullWidth
                            name="name" value={formData.name} onChange={handleChange}
                            error={Boolean(errors.name)} helperText={errors.name}
                            placeholder="e.g. Little Stars Academy"
                            sx={buildFieldSx(Boolean(errors.name))}
                        />

                        <TextField 
                            label="Owner Name" required fullWidth
                            name="owner_name" value={formData.owner_name} onChange={handleChange}
                            error={Boolean(errors.owner_name)} helperText={errors.owner_name}
                            placeholder="Full name of the principal/owner"
                            sx={buildFieldSx(Boolean(errors.owner_name))}
                        />

                        <EmailInput 
                            label="Email Address" required fullWidth
                            name="email" value={formData.email} onChange={handleChange}
                            error={Boolean(errors.email)} helperText={isEditMode ? "Account identifier cannot be changed" : errors.email}
                            disabled={isEditMode}
                            placeholder="admin@school.com"
                            sx={buildFieldSx(Boolean(errors.email))}
                        />

                        <PhoneInput 
                            label="Phone Number" fullWidth
                            name="phone" value={formData.phone} onChange={handleChange}
                            error={Boolean(errors.phone)} helperText={errors.phone}
                            placeholder="Official contact number"
                            sx={buildFieldSx(Boolean(errors.phone))}
                        />

                        {!isEditMode && (
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                <PasswordInput 
                                    label="Password" required fullWidth
                                    name="admin_password" value={formData.admin_password} onChange={handleChange}
                                    error={Boolean(errors.admin_password)} helperText={errors.admin_password}
                                    placeholder="Enter secure password"
                                    sx={buildFieldSx(Boolean(errors.admin_password))}
                                />
                                <PasswordInput 
                                    label="Confirm Password" required fullWidth
                                    name="confirm_password" value={formData.confirm_password} onChange={handleChange}
                                    error={Boolean(errors.confirm_password)} helperText={errors.confirm_password}
                                    placeholder="Repeat password"
                                    sx={buildFieldSx(Boolean(errors.confirm_password))}
                                />
                            </Box>
                        )}

                        <Box sx={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            p: 2, borderRadius: "12px", bgcolor: alpha(colorTokens.preschool.turquoise.main, 0.04),
                            border: `1.5px solid ${alpha(colorTokens.preschool.turquoise.main, 0.1)}`
                        }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                <Box sx={{ 
                                    width: 10, height: 10, borderRadius: "50%", 
                                    bgcolor: formData.is_active ? colorTokens.preschool.mint.main : colorTokens.preschool.coral.main,
                                    boxShadow: `0 0 8px ${formData.is_active ? colorTokens.preschool.mint.main : colorTokens.preschool.coral.main}`
                                }} />
                                <Box>
                                    <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: colorTokens.preschool.turquoise.dark }}>Status</Typography>
                                    <Typography sx={{ fontSize: "0.72rem", color: colorTokens.text.secondary }}>{formData.is_active ? "Account is Active" : "Account is Inactive"}</Typography>
                                </Box>
                            </Box>
                            <Switch checked={formData.is_active} onChange={handleChange} name="is_active" 
                                sx={{
                                    "& .MuiSwitch-switchBase.Mui-checked": { color: colorTokens.preschool.mint.main },
                                    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: colorTokens.preschool.mint.main }
                                }}
                            />
                        </Box>
                    </Box>

                    {/* ── RIGHT COLUMN ── */}
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, p: { xs: 2, md: 4 } }}>
                        {/* Logo Identity with Tabs */}
                        <Box sx={{
                            p: 3, borderRadius: "16px", border: `2px dashed ${colorTokens.border.subtle}`,
                            bgcolor: alpha(colorTokens.preschool.turquoise.main, 0.02),
                            display: "flex", flexDirection: "column", gap: 2,
                            transition: "all 0.3s ease",
                            "&:hover": { borderColor: colorTokens.preschool.turquoise.main, bgcolor: alpha(colorTokens.preschool.turquoise.main, 0.04) }
                        }}>
                            <Typography sx={{ fontSize: "0.75rem", fontWeight: 800, color: colorTokens.preschool.turquoise.dark, mb: -1 }}>LOGO IDENTITY</Typography>
                            
                            <Tabs 
                                value={logoTab} 
                                onChange={(_, v) => setLogoTab(v)}
                                sx={{
                                    minHeight: 32, mb: 1,
                                    "& .MuiTab-root": { minHeight: 32, fontSize: "0.7rem", fontWeight: 700, p: 0, minWidth: 80 },
                                    "& .MuiTabs-indicator": { bgcolor: colorTokens.preschool.turquoise.main }
                                }}
                            >
                                <Tab label="UPLOAD" />
                                <Tab label="LINK" />
                            </Tabs>

                            {logoTab === 0 ? (
                                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                                    {formData.logo_url && formData.logo_url.startsWith("data:") ? (
                                        <Box sx={{ position: "relative" }}>
                                            <img src={formData.logo_url} alt="Logo" style={{ height: 60, maxWidth: 200, objectFit: "contain", borderRadius: 8 }} />
                                            <IconButton size="small" onClick={handleClearLogo} sx={{ position: "absolute", top: -10, right: -10, bgcolor: colorTokens.preschool.coral.main, color: "white", "&:hover": { bgcolor: colorTokens.preschool.coral.dark } }}>
                                                <DeleteIcon sx={{ fontSize: 14 }} />
                                            </IconButton>
                                        </Box>
                                    ) : (
                                        <UploadIcon sx={{ fontSize: 40, color: colorTokens.preschool.turquoise.main, opacity: 0.5 }} />
                                    )}
                                    <input accept="image/*" id="logo-input" type="file" hidden onChange={handleLogoUpload} />
                                    <label htmlFor="logo-input">
                                        <Button component="span" variant="outlined" size="small" sx={{ borderRadius: "8px", textTransform: "none", fontWeight: 700 }}>
                                            {(formData.logo_url && formData.logo_url.startsWith("data:")) ? "Replace File" : "Choose School Logo"}
                                        </Button>
                                    </label>
                                </Box>
                            ) : (
                                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                    <TextField 
                                        label="Logo External URL" fullWidth
                                        name="logo_url" 
                                        value={formData.logo_url.startsWith("data:") ? "" : formData.logo_url} 
                                        onChange={handleChange}
                                        placeholder="https://example.com/logo.png"
                                        error={Boolean(errors.logo_url)} helperText={errors.logo_url}
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start"><LinkIcon sx={{ color: colorTokens.preschool.turquoise.main, fontSize: 18 }} /></InputAdornment>,
                                        }}
                                        sx={buildFieldSx(Boolean(errors.logo_url))}
                                    />
                                    {formData.logo_url && !formData.logo_url.startsWith("data:") && (
                                        <Box sx={{ display: "flex", justifyContent: "center", p: 1, bgcolor: "#f8fafc", borderRadius: "8px" }}>
                                            <img src={formData.logo_url} alt="Logo Preview" style={{ height: 40, maxWidth: 150, objectFit: "contain" }} />
                                        </Box>
                                    )}
                                </Box>
                            )}
                        </Box>

                        <TextField 
                            label="Address Line 1" fullWidth
                            name="address_line1" value={formData.address_line1} onChange={handleChange}
                            placeholder="e.g. 123 Education Lane"
                            sx={buildFieldSx(false)}
                        />

                        <TextField 
                            label="Address Line 2" fullWidth
                            name="address_line2" value={formData.address_line2} onChange={handleChange}
                            placeholder="Building, Floor or Suite"
                            sx={buildFieldSx(false)}
                        />

                        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3 }}>
                            <TextField 
                                label="State" fullWidth
                                name="state" value={formData.state} onChange={handleChange}
                                placeholder="Maharashtra"
                                sx={buildFieldSx(false)}
                            />
                            <TextField 
                                label="City" fullWidth
                                name="city" value={formData.city} onChange={handleChange}
                                placeholder="Mumbai"
                                sx={buildFieldSx(false)}
                            />
                        </Box>

                        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3 }}>
                            <TextField 
                                label="Pin Code" fullWidth
                                name="pin_code" value={formData.pin_code} onChange={handleChange}
                                placeholder="400001"
                                inputProps={{ maxLength: 20 }}
                                sx={buildFieldSx(false)}
                            />
                            <Select
                                label="Branding Template" fullWidth
                                value={formData.theme_template_id ?? ""}
                                onChange={(e) => setFormData(p => ({ ...p, theme_template_id: e.target.value === "" ? null : Number(e.target.value) }))}
                                sx={{ 
                                    borderRadius: "12px", bgcolor: "#ffffff",
                                    "& .MuiOutlinedInput-notchedOutline": { borderColor: colorTokens.border.subtle, borderWidth: "1.5px" },
                                    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: colorTokens.preschool.turquoise.main },
                                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: colorTokens.preschool.turquoise.main, borderWidth: "2px" }
                                }}
                            >
                                <MenuItem value=""><em>Default Theme</em></MenuItem>
                                {templates.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                            </Select>
                        </Box>
                        </Box>
                    </Box>
                </Box>

                {/* Footer Actions */}
                <Box sx={{ 
                    p: 2.5, display: "flex", justifyContent: "flex-end", gap: 2, 
                    bgcolor: alpha(colorTokens.background.default, 0.5),
                    borderTop: `1px solid ${colorTokens.border.subtle}`,
                    flexShrink: 0
                }}>
                    <Button variant="text" onClick={() => navigate("/tenants")}
                        sx={{ color: colorTokens.preschool.coral.main, fontWeight: 700, px: 4, "&:hover": { bgcolor: alpha(colorTokens.preschool.coral.main, 0.05) } }}>
                        Discard
                    </Button>
                    <Button variant="contained" onClick={handleSubmit} disabled={loading}
                        sx={{ 
                            background: `linear-gradient(135deg, ${colorTokens.preschool.turquoise.main} 0%, ${colorTokens.primary.main} 100%)`,
                            color: "white", fontWeight: 800, px: 5, borderRadius: "10px",
                            boxShadow: `0 4px 12px ${alpha(colorTokens.preschool.turquoise.main, 0.2)}`,
                            "&:hover": { transform: "translateY(-1px)", boxShadow: `0 6px 16px ${alpha(colorTokens.preschool.turquoise.main, 0.3)}` }
                        }}>
                        {loading ? "Processing…" : isEditMode ? "Save Changes" : "Finish & Create"}
                    </Button>
                </Box>
            </AppCard>
        </ListPageLayout>
    );
};

export default AddTenant;
