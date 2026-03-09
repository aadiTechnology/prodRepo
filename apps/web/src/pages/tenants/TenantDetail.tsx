import { useState, useEffect, useCallback } from "react";
import {
    Box,
    Button,
    Typography,
    Alert,
    CircularProgress,
    Breadcrumbs,
    Link,
    Paper,
    Divider,
} from "@mui/material";
import {
    Edit as EditIcon,
    Business as BusinessIcon,
    Delete as DeleteIcon,
    ArrowBack as BackIcon,
    InfoOutlined as InfoIcon,
} from "@mui/icons-material";
import { useNavigate, useParams, Link as RouterLink } from "react-router-dom";
import { Tenant } from "../../types/tenant";
import tenantService from "../../api/services/tenantService";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { DetailFieldRow } from "../../components/reusable";
import StatusChip from "../../components/roles/StatusChip";

// ─── Main Component ──────────────────────────────────────────
const TenantDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const fetchTenant = useCallback(async () => {
        if (!id) return;
        try {
            setLoading(true);
            const data = await tenantService.get(Number(id));
            setTenant(data);
        } catch (err: any) {
            setError(err?.message || "Failed to load tenant details.");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchTenant(); }, [fetchTenant]);

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

    // ── Loading ──
    if (loading) return (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh", bgcolor: BG }}>
            <CircularProgress sx={{ color: NAV }} />
        </Box>
    );

    if (!tenant) return <Alert severity="error">Tenant not found.</Alert>;

    const isActive = tenant.is_active;

    return (
        <>
            <Box sx={(theme) => ({ minHeight: "100vh", bgcolor: theme.palette.background.default, p: { xs: 2, sm: 2 }, pt: { xs: 2, sm: 2 } })}>

                {/* ── Breadcrumb ── */}
                <Breadcrumbs sx={{ mb: 2.5 }}>
                    <Link
                        component={RouterLink}
                        to="/tenants"
                        underline="hover"
                        sx={{ fontSize: 13, color: LABEL }}
                    >
                        Tenants
                    </Link>
                    <Typography sx={{ fontSize: 13, color: "#1a1a2e", fontWeight: 600 }}>
                        {tenant.name}
                    </Typography>
                </Breadcrumbs>

                {/* ── Page Header ── */}
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 2,
                        mb: 2.5,
                    }}
                >
                    {/* Left: icon + name + meta */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Box
                            sx={(theme) => ({
                                width: 48,
                                height: 48,
                                borderRadius: 1,
                                border: `1.5px solid ${theme.palette.divider}`,
                                bgcolor: theme.palette.background.paper,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                boxShadow: theme.shadows[1],
                            })}
                        >
                            <BusinessIcon sx={(theme) => ({ fontSize: 24, color: theme.palette.text.secondary })} />
                        </Box>
                        <Box>
                            <Typography
                                variant="h6"
                                fontWeight={700}
                                sx={(theme) => ({ color: theme.palette.text.primary, lineHeight: 1.2, fontSize: { xs: 16, sm: 20 } })}
                            >
                                {tenant.name}
                            </Typography>
                            <Typography variant="caption" sx={(theme) => ({ color: theme.palette.text.secondary })}>
                                ID: {tenant.id}&nbsp;&nbsp;•&nbsp;&nbsp;Created:{" "}
                                {new Date(tenant.created_at).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                })}
                            </Typography>
                        </Box>
                    </Box>

                    {/* Right: action buttons */}
                    <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
                        {/* Back */}
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<BackIcon sx={{ fontSize: 16 }} />}
                            onClick={() => navigate("/tenants")}
                            sx={(theme) => ({
                                borderRadius: 1,
                                textTransform: "none",
                                borderColor: theme.palette.divider,
                                color: theme.palette.text.primary,
                                fontWeight: 500,
                                fontSize: 13,
                                "&:hover": { borderColor: theme.palette.grey[400], bgcolor: theme.palette.action.hover },
                            })}
                        >
                            Back to List
                        </Button>

                        {/* Delete */}
                        <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            startIcon={<DeleteIcon sx={{ fontSize: 16 }} />}
                            onClick={() => setDeleteDialogOpen(true)}
                            sx={{
                                borderRadius: 1,
                                textTransform: "none",
                                fontWeight: 500,
                                fontSize: 13,
                            }}
                        >
                            Delete Tenant
                        </Button>

                        {/* Edit — navigates to edit page */}
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<EditIcon sx={{ fontSize: 16 }} />}
                            onClick={() => navigate(`/tenants/${id}/edit`)}
                            sx={(theme) => ({
                                borderRadius: 1,
                                textTransform: "none",
                                fontWeight: 600,
                                fontSize: 13,
                                bgcolor: theme.palette.grey[800],
                                "&:hover": { bgcolor: theme.palette.grey[700] },
                                boxShadow: "none",
                            })}
                        >
                            Edit Tenant
                        </Button>
                    </Box>
                </Box>

                {/* ── Alerts ── */}
                {error && (
                    <Alert
                        severity="error"
                        onClose={() => setError(null)}
                        sx={(theme) => ({ mb: 2, borderRadius: 1, border: `1px solid ${theme.palette.error.light}` })}
                    >
                        {error}
                    </Alert>
                )}
                {success && (
                    <Alert
                        severity="success"
                        sx={(theme) => ({ mb: 2, borderRadius: 1, border: `1px solid ${theme.palette.success.light}` })}
                    >
                        {success}
                    </Alert>
                )}

                {/* ── Profile Details Card ── */}
                <Paper
                    elevation={0}
                    sx={(theme) => ({
                        borderRadius: 1.5,
                        border: `1px solid ${theme.palette.divider}`,
                        bgcolor: theme.palette.background.paper,
                        overflow: "hidden",
                        boxShadow: theme.shadows[1],
                    })}
                >
                    {/* Card Header */}
                    <Box
                        sx={(theme) => ({
                            px: 3,
                            py: 2,
                            borderBottom: `1px solid ${theme.palette.divider}`,
                        })}
                    >
                        <Typography
                            variant="body1"
                            fontWeight={700}
                            sx={(theme) => ({ color: theme.palette.text.primary, fontSize: 15 })}
                        >
                            Profile Details
                        </Typography>
                    </Box>

                    {/* ── Tenant Name ── */}
                    <DetailFieldRow label="Tenant Name" last={false}>
                        <Typography variant="body2" sx={(theme) => ({ color: theme.palette.text.primary, fontWeight: 600 })}>
                            {tenant.name}
                        </Typography>
                    </DetailFieldRow>

                    {/* ── Tenant Status ── */}
                    <DetailFieldRow label="Tenant Status" last={false}>
                        <StatusChip status={isActive ? "ACTIVE" : "INACTIVE"} />
                    </DetailFieldRow>

                    {/* ── Account Owner ── */}
                    <DetailFieldRow label="Account Owner" last={false}>
                        <Typography variant="body2" sx={(theme) => ({ color: theme.palette.text.primary, fontWeight: 600 })}>
                            {tenant.owner_name}
                        </Typography>
                    </DetailFieldRow>

                    {/* ── Email Address (read-only) ── */}
                    <DetailFieldRow label="Email Address" last={false}>
                        <Typography variant="body2" sx={(theme) => ({ color: theme.palette.text.primary, fontWeight: 600 })}>
                            {tenant.email}
                        </Typography>
                        <Typography variant="caption" sx={(theme) => ({ color: theme.palette.info.main, display: "block", mt: 0.3 })}>
                            Primary contact for system notifications and billing
                        </Typography>
                    </DetailFieldRow>

                    {/* ── Phone Number ── */}
                    <DetailFieldRow label="Phone Number" last={false}>
                        <Typography variant="body2" sx={(theme) => ({ color: theme.palette.text.primary, fontWeight: 600 })}>
                            {tenant.phone || "—"}
                        </Typography>
                    </DetailFieldRow>

                    {/* ── Theme Template ── */}
                    <DetailFieldRow label="Theme Template" last={false}>
                        <Typography variant="body2" sx={(theme) => ({ color: theme.palette.text.primary, fontWeight: 500 })}>
                            {tenant.theme_template_id != null ? `ID ${tenant.theme_template_id}` : "—"}
                        </Typography>
                        {tenant.theme_template_id != null && (
                            <Typography variant="caption" sx={(theme) => ({ color: theme.palette.text.secondary, display: "block", mt: 0.3 })}>
                                Tenant branding is applied from this template at login.
                            </Typography>
                        )}
                    </DetailFieldRow>

                    {/* ── Business Description ── */}
                    <DetailFieldRow label="Business Description" last>
                        <Typography variant="body2" sx={(theme) => ({ color: theme.palette.text.primary, fontWeight: 500, lineHeight: 1.7 })}>
                            {tenant.description || "—"}
                        </Typography>
                    </DetailFieldRow>

                    {/* ── Footer notice ── */}
                    <Box
                        sx={(theme) => ({
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 1,
                            px: 3,
                            py: 1.5,
                            bgcolor: theme.palette.grey[50],
                            borderTop: `1px solid ${theme.palette.divider}`,
                        })}
                    >
                        <InfoIcon sx={(theme) => ({ fontSize: 15, color: theme.palette.text.secondary, mt: 0.1, flexShrink: 0 })} />
                        <Typography variant="caption" sx={(theme) => ({ color: theme.palette.text.secondary, lineHeight: 1.6 })}>
                            All fields are read-only on this screen. Click &quot;Edit Tenant&quot; to modify details.
                        </Typography>
                    </Box>
                </Paper>
            </Box>

            {/* ── Delete Confirmation Dialog ── */}
            <ConfirmDialog
                open={deleteDialogOpen}
                title="Confirm Tenant Deletion"
                message=""
                messageNode={
                    <Typography component="span">
                        Are you sure you want to delete <strong>{tenant?.name}</strong>?
                    </Typography>
                }
                warningContent={
                    <Alert severity="warning" sx={{ borderRadius: 1, mt: 2 }}>
                        This is a <strong>Soft Delete</strong>. The tenant will be removed from the list,
                        and <strong>all associated user accounts</strong> will be deactivated immediately.
                    </Alert>
                }
                confirmText="Delete Permanently"
                confirmVariant="error"
                onConfirm={handleDeleteTenant}
                onCancel={() => setDeleteDialogOpen(false)}
                loading={deleteLoading}
            />
        </>
    );
};

export default TenantDetail;
