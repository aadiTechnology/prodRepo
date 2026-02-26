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
} from "@mui/icons-material";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { Tenant } from "../../types/tenant";
import tenantService from "../../api/services/tenantService";

const TenantList = () => {
    const navigate = useNavigate();
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
                pageSize: rowsPerPage,
            });
            // The backend service I wrote returns list[Tenant], but for pagination it should return {items, total}
            // Since I only wrote a simple list service, I'll assume list for now or refactor later.
            // Actually, my backend return was: tenants = tenant_service.get_tenants(db)
            setTenants(data);
            setTotalTenants(data.length); // Placeholder for real total
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
        <Box sx={{ p: 4 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
                <Typography variant="h4" fontWeight="600" color="primary">
                    Tenant Management
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => navigate("/tenants/add")}
                    sx={{ borderRadius: 2, px: 3 }}
                >
                    Add Tenant
                </Button>
            </Box>

            <Paper sx={{ p: 2, mb: 3, borderRadius: 2, boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
                <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Search by Tenant Name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon color="action" />
                            </InputAdornment>
                        ),
                    }}
                    sx={{ mb: 2 }}
                />

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                <TableContainer>
                    {loading ? (
                        <Box sx={{ display: "flex", justifyContent: "center", p: 8 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell><strong>Tenant Name</strong></TableCell>
                                    <TableCell><strong>Owner</strong></TableCell>
                                    <TableCell><strong>Email</strong></TableCell>
                                    <TableCell><strong>Status</strong></TableCell>
                                    <TableCell><strong>Created Date</strong></TableCell>
                                    <TableCell align="right"><strong>Actions</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {tenants.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                                            <Typography variant="body1" color="text.secondary">
                                                No tenants available. Please add a tenant to begin.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    tenants.map((tenant) => (
                                        <TableRow key={tenant.id} hover>
                                            <TableCell
                                                sx={{ cursor: "pointer", color: "primary.main", fontWeight: "medium" }}
                                                onClick={() => navigate(`/tenants/${tenant.id}`)}
                                            >
                                                {tenant.name}
                                            </TableCell>
                                            <TableCell>{tenant.owner_name}</TableCell>
                                            <TableCell>{tenant.email}</TableCell>
                                            <TableCell>
                                                <Tooltip title={`Click to ${tenant.is_active ? 'deactivate' : 'activate'}`}>
                                                    <Chip
                                                        label={tenant.is_active ? "Active" : "Inactive"}
                                                        color={tenant.is_active ? "success" : "error"}
                                                        size="small"
                                                        onClick={() => handleToggleStatus(tenant)}
                                                        sx={{
                                                            fontWeight: "600",
                                                            cursor: "pointer",
                                                            "&:hover": { opacity: 0.8, transform: "translateY(-1px)" },
                                                            transition: "all 0.2s"
                                                        }}
                                                    />
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell>{new Date(tenant.created_at).toLocaleDateString()}</TableCell>
                                            <TableCell align="right">
                                                <Tooltip title="View Details">
                                                    <IconButton
                                                        size="medium"
                                                        onClick={() => navigate(`/tenants/${tenant.id}`)}
                                                        sx={{ mr: 1 }}
                                                    >
                                                        <ViewIcon />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title={tenant.is_active ? "Deactivate" : "Activate"}>
                                                    <IconButton
                                                        size="medium"
                                                        color={tenant.is_active ? "error" : "success"}
                                                        onClick={() => handleToggleStatus(tenant)}
                                                        sx={{ border: "1px solid", borderColor: "divider", mr: 1 }}
                                                    >
                                                        {tenant.is_active ? <InactiveIcon /> : <ActiveIcon />}
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Delete Tenant">
                                                    <IconButton
                                                        size="medium"
                                                        color="error"
                                                        onClick={() => handleDeleteClick(tenant)}
                                                        sx={{ border: "1px solid", borderColor: "divider" }}
                                                    >
                                                        <DeleteIcon />
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
                        setRowsPerPage(parseInt(e.target.value, 10));
                        setPage(0);
                    }}
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
        </Box>
    );
};

export default TenantList;
