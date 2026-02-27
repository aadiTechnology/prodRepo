import { useState } from "react";
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
    Card,
    CardContent,
} from "@mui/material";
import {
    Save as SaveIcon,
    ArrowBack as BackIcon,
    Business as BusinessIcon,
    Person as PersonIcon,
    Security as SecurityIcon,
} from "@mui/icons-material";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import tenantService from "../../api/services/tenantService";

const AddTenant = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

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
        // MUI Switch fires type="checkbox" events; explicitly branch on name for is_active
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" || name === "is_active" ? checked : value,
        }));
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

            setSuccess(result.message);
            setTimeout(() => navigate("/tenants"), 2000);
        } catch (err: any) {
            setError(err?.message || "Failed to provision tenant.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ p: 4 }}>
            <Breadcrumbs sx={{ mb: 2 }}>
                <Link component={RouterLink} to="/tenants" underline="hover" color="inherit">
                    Tenants
                </Link>
                <Typography color="text.primary">Add Tenant</Typography>
            </Breadcrumbs>

            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
                <Typography variant="h4" fontWeight="600" color="primary">
                    Create New Tenant
                </Typography>
                <Button
                    variant="outlined"
                    startIcon={<BackIcon />}
                    onClick={() => navigate("/tenants")}
                >
                    Back to List
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

            <form onSubmit={handleSubmit} noValidate>
                <Grid container spacing={3}>
                    {/* Tenant Information */}
                    <Grid item xs={12} md={6}>
                        <Card variant="outlined" sx={{ height: "100%", borderRadius: 2 }}>
                            <CardContent>
                                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                                    <BusinessIcon sx={{ mr: 1, color: "primary.main" }} />
                                    <Typography variant="h6" fontWeight="600">Tenant Details</Typography>
                                </Box>
                                <Divider sx={{ mb: 3 }} />
                                <Grid container spacing={2}>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="Company Name"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            required
                                            placeholder="e.g. Acme Corp"
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="Description"
                                            name="description"
                                            value={formData.description}
                                            onChange={handleChange}
                                            multiline
                                            rows={3}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="Phone Number"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={formData.is_active}
                                                    onChange={handleChange}
                                                    name="is_active"
                                                    color="primary"
                                                />
                                            }
                                            label="Active (Internal Account)"
                                        />
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Admin User Configuration */}
                    <Grid item xs={12} md={6}>
                        <Card variant="outlined" sx={{ height: "100%", borderRadius: 2 }}>
                            <CardContent>
                                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                                    <PersonIcon sx={{ mr: 1, color: "secondary.main" }} />
                                    <Typography variant="h6" fontWeight="600">Admin Account</Typography>
                                </Box>
                                <Divider sx={{ mb: 3 }} />
                                <Grid container spacing={2}>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="Owner Full Name"
                                            name="owner_name"
                                            value={formData.owner_name}
                                            onChange={handleChange}
                                            required
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="Admin Email Address"
                                            name="email"
                                            type="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            required
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Box sx={{ display: "flex", alignItems: "center", mb: 2, mt: 1 }}>
                                            <SecurityIcon sx={{ mr: 1, color: "text.secondary", fontSize: 20 }} />
                                            <Typography variant="subtitle2" color="text.secondary">Credentials</Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="Admin Password"
                                            name="admin_password"
                                            type="password"
                                            value={formData.admin_password}
                                            onChange={handleChange}
                                            required
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="Confirm Password"
                                            name="confirm_password"
                                            type="password"
                                            value={formData.confirm_password}
                                            onChange={handleChange}
                                            required
                                        />
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Submit Button */}
                    <Grid item xs={12}>
                        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                            <Button
                                type="submit"
                                variant="contained"
                                size="large"
                                disabled={loading}
                                startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
                                sx={{ px: 5, borderRadius: 2 }}
                            >
                                {loading ? "Creating..." : "Create Tenant"}
                            </Button>
                        </Box>
                    </Grid>
                </Grid>
            </form>
        </Box>
    );
};

export default AddTenant;
