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
    Chip,
    TablePagination,
    InputAdornment,
    Tooltip,
} from "@mui/material";
import {
    Add as AddIcon,
    Visibility as ViewIcon,
    Edit as EditIcon,
    Search as SearchIcon,
    CheckCircle as ActiveIcon,
    Cancel as InactiveIcon,
    Delete as DeleteIcon,
    Home as HomeIcon,
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
            p: 2,
            pt: 0,
            minHeight: "100vh",
            backgroundColor: "#f5f6fa",
            color: "#1a1a2e"
        }}>
            {/* Simplified Page Header */}
            <Box sx={{
                pt: 2,
                pb: 1.5,
                px: 0,
                mb: 1.5,
                mt: 0,
            }}>
                <Box sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    justifyContent: "space-between",
                    alignItems: { xs: "flex-start", sm: "center" },
                    gap: 2
                }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <IconButton
                            onClick={() => navigate("/")}
                            sx={{
                                backgroundColor: "#1a1a2e",
                                p: 1,
                                borderRadius: 1,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                "&:hover": { backgroundColor: "#2d2d44" }
                            }}
                        >
                            <HomeIcon sx={{ color: "white", fontSize: 24 }} />
                        </IconButton>
                        <Typography variant="h5" sx={{ fontWeight: 700, fontSize: "22px", color: "#1A1A2E" }}>
                            Tenant Management
                        </Typography>
                    </Box>

                    {/* Search and Add Action in Header Row */}
                    <Box sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        width: { xs: "100%", sm: "auto" }
                    }}>
                        <TextField
                            placeholder="Search by Tenant Name..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            variant="outlined"
                            size="small"
                            fullWidth={isMobile}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{ color: "#94a3b8" }} />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{
                                width: { xs: "100%", sm: "300px" },
                                "& .MuiOutlinedInput-root": {
                                    bgcolor: "white",
                                    borderRadius: "8px",
                                    "& fieldset": { borderColor: "#cbd5e1" },
                                    "&:hover fieldset": { borderColor: "#94a3b8" },
                                }
                            }}
                        />
                        <Tooltip title="Add Tenant">
                            <IconButton
                                onClick={() => navigate("/tenants/add")}
                                sx={{
                                    color: "#1a1a2e",
                                    flexShrink: 0,
                                    "&:hover": { bgcolor: "rgba(26, 26, 46, 0.04)" }
                                }}
                            >
                                <AddIcon sx={{ fontSize: 32, border: "2px solid #1a1a2e", borderRadius: "50%", p: 0.2 }} />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>
            </Box>

            <Paper sx={{
                borderRadius: "12px",
                overflow: "hidden",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                border: "1px solid #e2e8f0",
                bgcolor: "white"
            }}>
                {error && (
                    <Alert severity="error" sx={{ m: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
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
                                    <TableCell sx={{ fontWeight: 700, color: "#f8f9fb", fontSize: "0.80rem", px: 2, bgcolor: "#3a3a46" }}>Tenant Name</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: "#f8f9fb", fontSize: "0.80rem", px: 2, bgcolor: "#3a3a46" }}>Owner</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: "#f8f9fb", fontSize: "0.80rem", px: 2, bgcolor: "#3a3a46" }}>Email</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: "#f8f9fb", fontSize: "0.80rem", px: 2, bgcolor: "#3a3a46" }}>Status</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: "#f8f9fb", fontSize: "0.80rem", px: 2, bgcolor: "#3a3a46" }}>Created Date</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: "#f8f9fb", fontSize: "0.80rem", px: 2, bgcolor: "#3a3a46" }}>Edit</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: "#f8f9fb", fontSize: "0.80rem", px: 2, bgcolor: "#3a3a46" }}>Delete</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {tenants.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                                            <Typography variant="body1" color="text.secondary">
                                                No tenants available.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    tenants.map((tenant) => (
                                        <TableRow key={tenant.id} hover sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                                            <TableCell sx={{ fontWeight: 600, color: "#1a1a2e", py: 0.6, px: 2 }}>
                                                {tenant.name}
                                            </TableCell>
                                            <TableCell sx={{ color: "#64748b", py: 0.6, px: 2 }}>{tenant.owner_name}</TableCell>
                                            <TableCell sx={{ color: "#64748b", py: 0.6, px: 2 }}>{tenant.email}</TableCell>
                                            <TableCell sx={{ py: 0.6, px: 2 }}>
                                                <Typography sx={{
                                                    fontWeight: 600,
                                                    fontSize: "0.80rem", // Slightly smaller font
                                                    color: tenant.is_active ? "#10b981" : "#ef4444"
                                                }}>
                                                    {tenant.is_active ? "Active" : "Inactive"}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={{ color: "#64748b", py: 0.6, px: 2 }}>
                                                {new Date(tenant.created_at).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: '2-digit',
                                                    year: 'numeric'
                                                })}
                                            </TableCell>
                                            <TableCell sx={{ py: 0.6, px: 2 }}>
                                                <Tooltip title="Edit">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => navigate(`/tenants/${tenant.id}`)}
                                                        sx={{
                                                            color: "#94a3b8",
                                                            "&:hover": { color: "#1713eaff" }
                                                        }}
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell sx={{ py: 0.9, px: 2 }}>
                                                <Tooltip title="Delete">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleDeleteClick(tenant)}
                                                        sx={{
                                                            color: "#94a3b8",
                                                            "&:hover": { color: "#ef4444" }
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

                <TablePagination
                    component="div"
                    count={totalTenants}
                    page={page}
                    onPageChange={(_, newPage) => setPage(newPage)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => {
                        const newRowsPerPage = parseInt(e.target.value, 10);
                        setRowsPerPage(newRowsPerPage);
                        setPage(0);
                    }}
                    rowsPerPageOptions={[10, 25, 50]}
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} of ${count}`}
                    sx={{ px: 2, borderTop: "1px solid #e2e8f0" }}
                />
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
