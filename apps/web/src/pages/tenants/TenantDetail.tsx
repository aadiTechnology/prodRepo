import { useState, useEffect, useCallback } from "react";
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
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
} from "@mui/material";
import {
    Save as SaveIcon,
    ArrowBack as BackIcon,
    Edit as EditIcon,
    Cancel as CancelIcon,
    Business as BusinessIcon,
    Delete as DeleteIcon,
} from "@mui/icons-material";
import { useNavigate, useParams, Link as RouterLink } from "react-router-dom";
import { Tenant, TenantUpdate } from "../../types/tenant";
import tenantService from "../../api/services/tenantService";

const TenantDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saveLoading, setSaveLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    // Original and Current State for dirty checking
    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [editData, setEditData] = useState<TenantUpdate>({});
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);



    const fetchTenant = useCallback(async () => {
        if (!id) return;
        try {
            setLoading(true);
            const data = await tenantService.get(Number(id));
            setTenant(data);
            setEditData({
                name: data.name,
                owner_name: data.owner_name,
                phone: data.phone,
                description: data.description,
                is_active: data.is_active,
            });
        } catch (err: any) {
            setError(err?.message || "Failed to load tenant details.");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchTenant();
    }, [fetchTenant]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, checked, type } = e.target;
        setEditData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    /** Dedicated toggle for the status card click — avoids synthetic event casts */
    const handleStatusToggle = () => {
        setEditData((prev) => ({ ...prev, is_active: !prev.is_active }));
    };

    const isDirty = tenant ? (
        editData.name !== tenant.name ||
        editData.owner_name !== tenant.owner_name ||
        editData.phone !== tenant.phone ||
        editData.description !== (tenant.description || "") ||
        editData.is_active !== tenant.is_active
    ) : false;

    const handleSave = async () => {
        if (!id || !tenant) return;

        try {
            setSaveLoading(true);
            setError(null);
            await tenantService.update(Number(id), editData);
            setSuccess("Tenant updated successfully.");
            setIsEditing(false);
            fetchTenant();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err?.message || "Unable to update tenant. Please try again.");
        } finally {
            setSaveLoading(false);
        }
    };

    const handleDeleteTenant = async () => {
        if (!id) return;
        try {
            setDeleteLoading(true);
            setError(null);
            await tenantService.delete(Number(id));
            navigate("/tenants");
        } catch (err: any) {
            setError(err?.message || "Failed to delete tenant.");
            setDeleteDialogOpen(false);
        } finally {
            setDeleteLoading(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!tenant) {
        return <Alert severity="error">Tenant not found.</Alert>;
    }

    return (
        <>
            <Box sx={{ p: 4 }}>
                <Breadcrumbs sx={{ mb: 2 }}>
                    <Link component={RouterLink} to="/tenants" underline="hover" color="inherit">
                        Tenants
                    </Link>
                    <Typography color="text.primary">{tenant.name}</Typography>
                </Breadcrumbs>

                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                        <BusinessIcon sx={{ mr: 2, fontSize: 40, color: "primary.main" }} />
                        <Box>
                            <Typography variant="h4" fontWeight="600">
                                {tenant.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                ID: {tenant.id} | Created: {new Date(tenant.created_at).toLocaleDateString()}
                            </Typography>
                        </Box>
                    </Box>
                    <Box sx={{ display: "flex", gap: 2 }}>
                        <Button variant="outlined" startIcon={<BackIcon />} onClick={() => navigate("/tenants")}>
                            Back to List
                        </Button>
                        {!isEditing ? (
                            <>
                                <Button
                                    variant="outlined"
                                    color="error"
                                    startIcon={<DeleteIcon />}
                                    onClick={() => setDeleteDialogOpen(true)}
                                >
                                    Delete Tenant
                                </Button>
                                <Button variant="contained" startIcon={<EditIcon />} onClick={() => setIsEditing(true)}>
                                    Edit Tenant
                                </Button>
                            </>
                        ) : (
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={saveLoading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                                onClick={handleSave}
                                disabled={!isDirty || saveLoading}
                            >
                                Save Changes
                            </Button>
                        )}
                    </Box>
                </Box>

                {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

                <Grid container spacing={3}>
                    <Grid item xs={12} md={8}>
                        <Card variant="outlined" sx={{ borderRadius: 2 }}>
                            <CardContent>
                                <Typography variant="h6" fontWeight="600" gutterBottom>Profile Details</Typography>
                                <Divider sx={{ mb: 3 }} />
                                <Grid container spacing={2}>
                                    <Grid item xs={12} md={6}>
                                        <TextField
                                            fullWidth
                                            label="Tenant Name"
                                            name="name"
                                            value={isEditing ? editData.name : tenant.name}
                                            onChange={handleInputChange}
                                            InputProps={{ readOnly: !isEditing }}
                                            variant={isEditing ? "outlined" : "filled"}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <TextField
                                            fullWidth
                                            label="Owner Name"
                                            name="owner_name"
                                            value={isEditing ? editData.owner_name : tenant.owner_name}
                                            onChange={handleInputChange}
                                            InputProps={{ readOnly: !isEditing }}
                                            variant={isEditing ? "outlined" : "filled"}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <TextField
                                            fullWidth
                                            label="Email Address"
                                            value={tenant.email}
                                            InputProps={{ readOnly: true }}
                                            variant="filled"
                                            helperText="Email is a unique identifier and cannot be changed."
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <TextField
                                            fullWidth
                                            label="Phone Number"
                                            name="phone"
                                            value={isEditing ? editData.phone : tenant.phone || ""}
                                            onChange={handleInputChange}
                                            InputProps={{ readOnly: !isEditing }}
                                            variant={isEditing ? "outlined" : "filled"}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="Description"
                                            name="description"
                                            value={isEditing ? editData.description : tenant.description || ""}
                                            onChange={handleInputChange}
                                            multiline
                                            rows={3}
                                            InputProps={{ readOnly: !isEditing }}
                                            variant={isEditing ? "outlined" : "filled"}
                                        />
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: "rgba(0,0,0,0.02)" }}>
                            <CardContent>
                                <Typography variant="h6" fontWeight="600" gutterBottom>Account Status</Typography>
                                <Divider sx={{ mb: 3 }} />
                                <Box
                                    onClick={isEditing ? handleStatusToggle : undefined}
                                    sx={{
                                        p: 3,
                                        bgcolor: (isEditing ? editData.is_active : tenant.is_active) ? "success.main" : "error.main",
                                        borderRadius: 2,
                                        color: "white",
                                        mb: 2,
                                        cursor: isEditing ? "pointer" : "default",
                                        transition: "all 0.2s",
                                        "&:hover": isEditing ? { transform: "scale(1.02)", boxShadow: 3 } : {},
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        justifyContent: "center"
                                    }}
                                >
                                    <Typography variant="h4" align="center" fontWeight="800">
                                        {(isEditing ? editData.is_active : tenant.is_active) ? "ACTIVE" : "INACTIVE"}
                                    </Typography>
                                    {isEditing && (
                                        <Typography variant="caption" sx={{ mt: 1, opacity: 0.8 }}>
                                            Click to Toggle
                                        </Typography>
                                    )}
                                </Box>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={isEditing ? !!editData.is_active : tenant.is_active}
                                            onChange={handleInputChange}
                                            name="is_active"
                                            disabled={!isEditing}
                                            color="primary"
                                        />
                                    }
                                    label={isEditing ? "Change Status" : "Current Status"}
                                />
                                <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 2 }}>
                                    If deactivated, all users associated with this tenant will be blocked from logging in immediately.
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                {isEditing && (
                    <Box sx={{ mt: 4, display: "flex", justifyContent: "flex-end", gap: 2 }}>
                        <Button startIcon={<CancelIcon />} onClick={() => setIsEditing(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="contained"
                            color="success"
                            startIcon={saveLoading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                            onClick={handleSave}
                            disabled={!isDirty || saveLoading}
                        >
                            Save Changes
                        </Button>
                    </Box>
                )}
            </Box>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => !deleteLoading && setDeleteDialogOpen(false)}
                PaperProps={{
                    sx: { borderRadius: 3, width: "100%", maxWidth: 450 }
                }}
            >
                <DialogTitle sx={{ fontWeight: "700", color: "error.main" }}>
                    Confirm Tenant Deletion
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        Are you sure you want to delete <strong>{tenant?.name}</strong>?
                    </DialogContentText>
                    <Alert severity="warning" sx={{ borderRadius: 2 }}>
                        This will perform a <strong>Soft Delete</strong>. The tenant will be hidden,
                        and <strong>all associated user accounts</strong> will be deactivated immediately.
                    </Alert>
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 0 }}>
                    <Button
                        onClick={() => setDeleteDialogOpen(false)}
                        disabled={deleteLoading}
                        sx={{ borderRadius: 2 }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDeleteTenant}
                        color="error"
                        variant="contained"
                        disabled={deleteLoading}
                        startIcon={deleteLoading ? <CircularProgress size={20} color="inherit" /> : <DeleteIcon />}
                        sx={{ borderRadius: 2, px: 3 }}
                    >
                        {deleteLoading ? "Deleting..." : "Delete Permanently"}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default TenantDetail;
