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

// ─── Design tokens matching TenantList ───────────────────────
const NAV = "#1a1a2e";
const NAV2 = "#2d2d44";
const LABEL = "#64748b";
const BG = "#f5f6fa";
const BORDER = "#e2e8f0";

// ─── Field Row ───────────────────────────────────────────────
interface RowProps { label: string; children: React.ReactNode; last?: boolean; }
const FieldRow = ({ label, children, last }: RowProps) => (
    <Box>
        <Box
            sx={{
                display: "flex",
                alignItems: "flex-start",
                gap: 2,
                py: 2.5,
                px: 3,
                flexWrap: { xs: "wrap", sm: "nowrap" },
            }}
        >
            <Typography
                variant="body2"
                sx={{ minWidth: 180, flexShrink: 0, color: LABEL, pt: 0.3 }}
            >
                {label}
            </Typography>
            <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
        </Box>
        {!last && <Divider sx={{ mx: 0 }} />}
    </Box>
);

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
            <Box sx={{ minHeight: "100vh", bgcolor: BG, p: { xs: 2, sm: 2 }, pt: { xs: 2, sm: 2 } }}>

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
                            sx={{
                                width: 48,
                                height: 48,
                                borderRadius: "8px",
                                border: `1.5px solid ${BORDER}`,
                                bgcolor: "white",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                            }}
                        >
                            <BusinessIcon sx={{ fontSize: 24, color: LABEL }} />
                        </Box>
                        <Box>
                            <Typography
                                variant="h6"
                                fontWeight={700}
                                sx={{ color: NAV, lineHeight: 1.2, fontSize: { xs: 16, sm: 20 } }}
                            >
                                {tenant.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: LABEL }}>
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
                            sx={{
                                borderRadius: "8px",
                                textTransform: "none",
                                borderColor: BORDER,
                                color: "#374151",
                                fontWeight: 500,
                                fontSize: 13,
                                "&:hover": { borderColor: "#94a3b8", bgcolor: "rgba(0,0,0,0.02)" },
                            }}
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
                                borderRadius: "8px",
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
                            sx={{
                                borderRadius: "8px",
                                textTransform: "none",
                                fontWeight: 600,
                                fontSize: 13,
                                bgcolor: NAV,
                                "&:hover": { bgcolor: NAV2 },
                                boxShadow: "none",
                            }}
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
                        sx={{ mb: 2, borderRadius: "8px", border: `1px solid #fecaca` }}
                    >
                        {error}
                    </Alert>
                )}
                {success && (
                    <Alert
                        severity="success"
                        sx={{ mb: 2, borderRadius: "8px", border: `1px solid #bbf7d0` }}
                    >
                        {success}
                    </Alert>
                )}

                {/* ── Profile Details Card ── */}
                <Paper
                    elevation={0}
                    sx={{
                        borderRadius: "12px",
                        border: `1px solid ${BORDER}`,
                        bgcolor: "white",
                        overflow: "hidden",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                    }}
                >
                    {/* Card Header */}
                    <Box
                        sx={{
                            px: 3,
                            py: 2,
                            borderBottom: `1px solid ${BORDER}`,
                        }}
                    >
                        <Typography
                            variant="body1"
                            fontWeight={700}
                            sx={{ color: NAV, fontSize: 15 }}
                        >
                            Profile Details
                        </Typography>
                    </Box>

                    {/* ── Tenant Name ── */}
                    <FieldRow label="Tenant Name">
                        <Typography variant="body2" sx={{ color: NAV, fontWeight: 600 }}>
                            {tenant.name}
                        </Typography>
                    </FieldRow>

                    {/* ── Tenant Status ── */}
                    <FieldRow label="Tenant Status">
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.6,
                                    px: 1.2,
                                    py: 0.4,
                                    borderRadius: "20px",
                                    bgcolor: isActive ? "#f0fdf4" : "#fff1f2",
                                    border: `1px solid ${isActive ? "#bbf7d0" : "#fecdd3"}`,
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 7,
                                        height: 7,
                                        borderRadius: "50%",
                                        bgcolor: isActive ? "#10b981" : "#ef4444",
                                    }}
                                />
                                <Typography
                                    variant="caption"
                                    fontWeight={700}
                                    sx={{ color: isActive ? "#10b981" : "#ef4444", fontSize: 12 }}
                                >
                                    {isActive ? "Active" : "Inactive"}
                                </Typography>
                            </Box>
                        </Box>
                    </FieldRow>

                    {/* ── Account Owner ── */}
                    <FieldRow label="Account Owner">
                        <Typography variant="body2" sx={{ color: NAV, fontWeight: 600 }}>
                            {tenant.owner_name}
                        </Typography>
                    </FieldRow>

                    {/* ── Email Address (read-only) ── */}
                    <FieldRow label="Email Address">
                        <Typography variant="body2" sx={{ color: NAV, fontWeight: 600 }}>
                            {tenant.email}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#3b82f6", display: "block", mt: 0.3 }}>
                            Primary contact for system notifications and billing
                        </Typography>
                    </FieldRow>

                    {/* ── Phone Number ── */}
                    <FieldRow label="Phone Number">
                        <Typography variant="body2" sx={{ color: NAV, fontWeight: 600 }}>
                            {tenant.phone || "—"}
                        </Typography>
                    </FieldRow>

                    {/* ── Business Description ── */}
                    <FieldRow label="Business Description" last>
                        <Typography variant="body2" sx={{ color: NAV, fontWeight: 500, lineHeight: 1.7 }}>
                            {tenant.description || "—"}
                        </Typography>
                    </FieldRow>

                    {/* ── Footer notice ── */}
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 1,
                            px: 3,
                            py: 1.5,
                            bgcolor: "#f8fafc",
                            borderTop: `1px solid ${BORDER}`,
                        }}
                    >
                        <InfoIcon sx={{ fontSize: 15, color: LABEL, mt: 0.1, flexShrink: 0 }} />
                        <Typography variant="caption" sx={{ color: LABEL, lineHeight: 1.6 }}>
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
                    <Alert severity="warning" sx={{ borderRadius: "8px", mt: 2 }}>
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
