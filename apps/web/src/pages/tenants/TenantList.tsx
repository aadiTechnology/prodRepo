import { useState, useEffect, useCallback } from "react";
import {
    Box,
    Button,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    IconButton,
    Alert,
    CircularProgress,
    TextField,
    InputAdornment,
    Tooltip,
    Select,
    MenuItem,
} from "@mui/material";
import {
    Add as AddIcon,
    Edit as EditIcon,
    Search as SearchIcon,
    Delete as DeleteIcon,
    Home as HomeIcon,
    KeyboardArrowLeft as PrevIcon,
    KeyboardArrowRight as NextIcon,
} from "@mui/icons-material";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTheme, useMediaQuery } from "@mui/material";
import { PageHeader } from "../../components/common";
import { Tenant } from "../../types/tenant";
import tenantService from "../../api/services/tenantService";

const TenantList = () => {
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Search and Pagination states
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalTenants, setTotalTenants] = useState(0);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const fetchTenants = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            // Backend expects page and pageSize as params
            const data = await tenantService.list({
                search: search || undefined,
                page: page + 1, // API usually 1-indexed
                page_size: rowsPerPage,
            });
            setTenants(data.items);
            setTotalTenants(data.total);
        } catch (err: any) {
            setError(err?.message || "Failed to fetch tenants.");
        } finally {
            setLoading(false);
        }
    }, [search, page, rowsPerPage]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchTenants();
        }, 500); // Debounce search
        return () => clearTimeout(timer);
    }, [fetchTenants]);

    const handleToggleStatus = async (tenant: Tenant) => {
        try {
            if (tenant.is_active) {
                await tenantService.deactivate(tenant.id);
            } else {
                await tenantService.activate(tenant.id);
            }
            fetchTenants();
        } catch (err: any) {
            setError(err?.message || "Failed to update tenant status.");
        }
    };

    const handleDeleteClick = (tenant: Tenant) => {
        setTenantToDelete(tenant);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!tenantToDelete) return;
        try {
            setDeleteLoading(true);
            await tenantService.delete(tenantToDelete.id);
            setDeleteDialogOpen(false);
            setTenantToDelete(null);
            fetchTenants();
        } catch (err: any) {
            setError(err?.message || "Failed to delete tenant.");
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <Box sx={{
            px: { xs: 2, md: 4 },
            pb: 4,
            minHeight: "100vh",
            backgroundColor: "#f8fafc",
            display: "flex",
            flexDirection: "column"
        }}>
            {/* Header - Aligned with AddTenant */}
            {/* Header - Standardized using PageHeader */}
            <PageHeader
                title="Tenant Management"
                onBack={() => navigate("/")}
                backIcon={<HomeIcon sx={{ color: "white", fontSize: 24 }} />}
                actions={
                    <>
                        <TextField
                            placeholder="Search tenants..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            variant="outlined"
                            size="small"
                            fullWidth={isMobile}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{ color: "#94a3b8", fontSize: 20 }} />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{
                                width: { xs: "100%", sm: "280px" },
                                "& .MuiOutlinedInput-root": {
                                    bgcolor: "white",
                                    borderRadius: "12px",
                                    fontSize: "0.9rem",
                                    fontWeight: 500,
                                    "& fieldset": { borderColor: "#e2e8f0", borderWidth: "1.2px" },
                                    "&:hover fieldset": { borderColor: "#cbd5e1" },
                                    "&.Mui-focused": {
                                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.03)",
                                        "& fieldset": { borderColor: "#1A1A2E", borderWidth: "1.8px" },
                                    }
                                }
                            }}
                        />
                        <Tooltip title="Add Tenant">
                            <IconButton
                                onClick={() => navigate("/tenants/add")}
                                sx={{
                                    backgroundColor: "#1a1a2e",
                                    color: "white",
                                    borderRadius: 1.2,
                                    width: 44,
                                    height: 44,
                                    boxShadow: "0 4px 10px rgba(26,26,46,0.2)",
                                    "&:hover": { backgroundColor: "#2d2d44", transform: "translateY(-1px)" }
                                }}
                            >
                                <AddIcon sx={{ fontSize: 24 }} />
                            </IconButton>
                        </Tooltip>
                    </>
                }
            />

            <Paper sx={{
                borderRadius: "12px",
                overflow: "hidden",
                boxShadow: "0 1px 3px rgba(0,0,0,0.01)",
                border: "1px solid #e2e8f0",
                bgcolor: "white",
                flexGrow: 1,
                display: "flex",
                flexDirection: "column"
            }}>
                {error && (
                    <Alert severity="error" sx={{ m: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {/* Info Bar */}
                {!loading && totalTenants > 0 && (
                    <Box sx={{ py: 1.2, px: 3, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", bgcolor: "#fcfdfe" }}>
                        <Typography sx={{ fontSize: "0.80rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            Tenant Directory
                        </Typography>
                        <Typography sx={{ fontSize: "0.85rem", color: "#94a3b8", fontWeight: 500 }}>
                            Showing <Box component="span" sx={{ color: "#1a1a2e", fontWeight: 700 }}>{Math.min(page * rowsPerPage + 1, totalTenants)}-{Math.min((page + 1) * rowsPerPage, totalTenants)}</Box> of <Box component="span" sx={{ color: "#1a1a2e", fontWeight: 700 }}>{totalTenants}</Box> tenants
                        </Typography>
                    </Box>
                )}

                <TableContainer sx={{ maxHeight: "calc(100vh - 200px)" }}>
                    {loading ? (
                        <Box sx={{ display: "flex", justifyContent: "center", p: 8 }}>
                            <CircularProgress sx={{ color: "#1a1a2e" }} />
                        </Box>
                    ) : (
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 700, color: "white", fontSize: "0.80rem", px: 2, py: 1.2, bgcolor: "#1a1a2e" }}>Logo</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: "white", fontSize: "0.80rem", px: 2, py: 1.2, bgcolor: "#1a1a2e" }}>Tenant Name</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: "white", fontSize: "0.80rem", px: 2, py: 1.2, bgcolor: "#1a1a2e" }}>Owner</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: "white", fontSize: "0.80rem", px: 2, py: 1.2, bgcolor: "#1a1a2e" }}>Email</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: "white", fontSize: "0.80rem", px: 2, py: 1.2, bgcolor: "#1a1a2e" }}>Status</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: "white", fontSize: "0.80rem", px: 2, py: 1.2, bgcolor: "#1a1a2e" }}>Created Date</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: "white", fontSize: "0.80rem", px: 2, py: 1.2, bgcolor: "#1a1a2e" }}>Edit</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: "white", fontSize: "0.80rem", px: 2, py: 1.2, bgcolor: "#1a1a2e" }}>Delete</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {tenants.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                                            <Typography variant="body1" color="text.secondary">
                                                No tenants available.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    tenants.map((tenant) => (
                                        <TableRow
                                            key={tenant.id}
                                            hover
                                            sx={{
                                                "&.MuiTableRow-hover:hover": { bgcolor: "#f1f5f9" },
                                                "& td": { borderBottom: "1px solid #f1f5f9" }
                                            }}
                                        >
                                            <TableCell sx={{ py: 0.8, px: 2 }}>
                                                {tenant.logo_url ? (
                                                    <img
                                                        src={tenant.logo_url}
                                                        alt={tenant.name}
                                                        style={{ height: 28, width: "auto", maxWidth: 80, objectFit: "contain" }}
                                                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                                                    />
                                                ) : (
                                                    <Typography variant="caption" color="text.secondary">—</Typography>
                                                )}
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 700, color: "#1a1a2e", py: 0.8, px: 2, fontSize: "0.85rem" }}>
                                                {tenant.name}
                                            </TableCell>
                                            <TableCell sx={{ color: "#475569", py: 0.8, px: 2, fontSize: "0.85rem", fontWeight: 500 }}>{tenant.owner_name}</TableCell>
                                            <TableCell sx={{ color: "#475569", py: 0.8, px: 2, fontSize: "0.85rem" }}>{tenant.email}</TableCell>
                                            <TableCell sx={{ py: 0.8, px: 2 }}>
                                                <Box sx={{
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: 1,
                                                    px: 1.2,
                                                    py: 0.35,
                                                    borderRadius: "20px",
                                                    bgcolor: tenant.is_active ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                                                    color: tenant.is_active ? "#059669" : "#dc2626",
                                                    border: `1px solid ${tenant.is_active ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"}`
                                                }}>
                                                    <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: "currentColor" }} />
                                                    <Typography sx={{ fontWeight: 700, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                                        {tenant.is_active ? "Active" : "Inactive"}
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell sx={{ color: "#475569", py: 0.8, px: 2, fontSize: "0.85rem", fontWeight: 500 }}>
                                                {new Date(tenant.created_at).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: '2-digit',
                                                    year: 'numeric'
                                                })}
                                            </TableCell>
                                            <TableCell sx={{ py: 0.8, px: 2 }}>
                                                <Tooltip title="Edit">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => navigate(`/tenants/${tenant.id}/edit`)}
                                                        sx={{
                                                            color: "#64748b",
                                                            p: 0.5,
                                                            "&:hover": { color: "#2626e4", bgcolor: "#f1f5f9" }
                                                        }}
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell sx={{ py: 0.8, px: 2 }}>
                                                <Tooltip title="Delete">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleDeleteClick(tenant)}
                                                        sx={{
                                                            color: "#64748b",
                                                            p: 0.5,
                                                            "&:hover": { color: "#ef4444", bgcolor: "#fee2e2" }
                                                        }}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </TableContainer>

                {/* Custom Pagination Footer */}
                {!loading && tenants.length > 0 && (
                    <Box sx={{
                        px: 2,
                        py: 1,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderTop: "1px solid #f1f5f9",
                        bgcolor: "#fcfdfe"
                    }}>
                        {/* Left: Rows Per Page */}
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b" }}>
                                Rows per page
                            </Typography>
                            <Select
                                value={rowsPerPage}
                                onChange={(e) => {
                                    setRowsPerPage(Number(e.target.value));
                                    setPage(0);
                                }}
                                size="small"
                                sx={{
                                    height: "28px",
                                    width: "65px",
                                    fontSize: "0.8rem",
                                    fontWeight: 600,
                                    bgcolor: "white",
                                    borderRadius: "6px",
                                    "& .MuiOutlinedInput-notchedOutline": { borderColor: "#e2e8f0" },
                                }}
                            >
                                <MenuItem value={10}>10</MenuItem>
                                <MenuItem value={20}>20</MenuItem>
                                <MenuItem value={25}>25</MenuItem>
                                <MenuItem value={50}>50</MenuItem>
                            </Select>
                        </Box>

                        {/* Right: Page Navigation */}
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                            <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b" }}>
                                <Box component="span" sx={{ color: "#1a1a2e" }}>{page * rowsPerPage + 1}-{Math.min((page + 1) * rowsPerPage, totalTenants)}</Box> of <Box component="span" sx={{ color: "#1a1a2e" }}>{totalTenants}</Box>
                            </Typography>
                            <Box sx={{ display: "flex", gap: 0.5 }}>
                                <IconButton
                                    size="small"
                                    disabled={page === 0}
                                    onClick={() => setPage(page - 1)}
                                    sx={{ border: "1px solid #e2e8f0", borderRadius: "6px", p: 0.4, "&:hover": { bgcolor: "#f1f5f9" } }}
                                >
                                    <PrevIcon sx={{ fontSize: "1.1rem" }} />
                                </IconButton>

                                <IconButton
                                    size="small"
                                    disabled={page >= Math.ceil(totalTenants / rowsPerPage) - 1}
                                    onClick={() => setPage(page + 1)}
                                    sx={{ border: "1px solid #e2e8f0", borderRadius: "6px", p: 0.4, "&:hover": { bgcolor: "#f1f5f9" } }}
                                >
                                    <NextIcon sx={{ fontSize: "1.1rem" }} />
                                </IconButton>
                            </Box>
                        </Box>
                    </Box>
                )}
            </Paper>

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
                        Are you sure you want to delete <strong>{tenantToDelete?.name}</strong>?
                    </DialogContentText>
                    <Alert severity="warning" sx={{ borderRadius: 2 }}>
                        This is a <strong>Soft Delete</strong>. The tenant will be removed from the list,
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
                        onClick={handleConfirmDelete}
                        color="error"
                        variant="contained"
                        disabled={deleteLoading}
                        startIcon={deleteLoading ? <CircularProgress size={20} /> : <DeleteIcon />}
                        sx={{ borderRadius: 2, px: 3 }}
                    >
                        {deleteLoading ? "Deleting..." : "Delete Permanently"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box >
    );
};

export default TenantList;
