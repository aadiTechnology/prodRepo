import { useState, useEffect, useCallback } from "react";
import {
    Box,
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
    Tooltip,
    Snackbar,
} from "@mui/material";
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Home as HomeIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { Tenant } from "../../types/tenant";
import tenantService from "../../api/services/tenantService";
import { ListPageLayout } from "../../components/reusable";
import { ListPageToolbar } from "../../components/reusable";
import { DirectoryInfoBar } from "../../components/reusable";
import { TablePaginationBar } from "../../components/reusable";
import { PageHeader } from "../../components/layout";
import ConfirmDialog from "../../components/common/ConfirmDialog";

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

    // Confirm dialog states
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Snackbar/toast state
    const [snackbar, setSnackbar] = useState<string | null>(null);
    const showSuccessToast = (message: string) => setSnackbar(message);

    // Sorting state
    const [sortBy, setSortBy] = useState<"name" | "created_at">("created_at");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

    const fetchTenants = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await tenantService.list({
                search: search || undefined,
                page: page + 1,
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
        }, 500);
        return () => clearTimeout(timer);
    }, [fetchTenants]);

    const handleDeleteClick = (tenant: Tenant) => {
        setTenantToDelete(tenant);
        setConfirmDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!tenantToDelete) return;
        try {
            setDeleteLoading(true);
            await tenantService.delete(tenantToDelete.id);
            setConfirmDialogOpen(false);
            setTenantToDelete(null);
            showSuccessToast("Tenant deleted successfully");
            fetchTenants();
        } catch (err: any) {
            setError(err?.message || "Failed to delete tenant.");
        } finally {
            setDeleteLoading(false);
        }
    };

    // Client-side sort on fetched tenants
    const sortedTenants = [...tenants].sort((a, b) => {
        let aVal: any;
        let bVal: any;

        if (sortBy === "created_at") {
            aVal = a.created_at ? new Date(a.created_at).getTime() : 0;
            bVal = b.created_at ? new Date(b.created_at).getTime() : 0;
        } else {
            aVal = (a.name || "").toLowerCase();
            bVal = (b.name || "").toLowerCase();
        }

        if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
        if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
        return 0;
    });

    return (
        <ListPageLayout
            pageBackground
            contentPaddingSize="none"
            header={
                <PageHeader
                    title="Tenant Management"
                    onBack={() => navigate("/")}
                    backIcon={<HomeIcon sx={{ color: "white", fontSize: 24 }} />}
                    actions={
                        <ListPageToolbar
                            searchValue={search}
                            onSearchChange={setSearch}
                            searchPlaceholder="Search tenants..."
                            onAddClick={() => navigate("/tenants/add")}
                            addLabel="Add Tenant"
                            addIcon={<AddIcon sx={{ fontSize: 24 }} />}
                        />
                    }
                />
            }
        >
            {error && (
                <Alert severity="error" sx={{ m: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {!loading && totalTenants > 0 && (
                <DirectoryInfoBar
                    label="Tenant Directory"
                    rangeStart={Math.min(page * rowsPerPage + 1, totalTenants)}
                    rangeEnd={Math.min((page + 1) * rowsPerPage, totalTenants)}
                    total={totalTenants}
                />
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
                                    <TableCell
                                        sx={{
                                            fontWeight: 700,
                                            color: "white",
                                            fontSize: "0.80rem",
                                            px: 2,
                                            py: 1.2,
                                            bgcolor: "#1a1a2e",
                                        }}
                                    >
                                        Logo
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            fontWeight: 700,
                                            color: "white",
                                            fontSize: "0.80rem",
                                            px: 2,
                                            py: 1.2,
                                            bgcolor: "#1a1a2e",
                                            cursor: "pointer",
                                            userSelect: "none",
                                        }}
                                        onClick={() => {
                                            if (sortBy === "name") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                                            else { setSortBy("name"); setSortOrder("asc"); }
                                        }}
                                    >
                                        Tenant Name{" "}
                                        {sortBy === "name" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            fontWeight: 700,
                                            color: "white",
                                            fontSize: "0.80rem",
                                            px: 2,
                                            py: 1.2,
                                            bgcolor: "#1a1a2e",
                                        }}
                                    >
                                        Owner
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            fontWeight: 700,
                                            color: "white",
                                            fontSize: "0.80rem",
                                            px: 2,
                                            py: 1.2,
                                            bgcolor: "#1a1a2e",
                                        }}
                                    >
                                        Email
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            fontWeight: 700,
                                            color: "white",
                                            fontSize: "0.80rem",
                                            px: 2,
                                            py: 1.2,
                                            bgcolor: "#1a1a2e",
                                        }}
                                    >
                                        Status
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            fontWeight: 700,
                                            color: "white",
                                            fontSize: "0.80rem",
                                            px: 2,
                                            py: 1.2,
                                            bgcolor: "#1a1a2e",
                                            cursor: "pointer",
                                            userSelect: "none",
                                        }}
                                        onClick={() => {
                                            if (sortBy === "created_at") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                                            else { setSortBy("created_at"); setSortOrder("asc"); }
                                        }}
                                    >
                                        Created Date{" "}
                                        {sortBy === "created_at" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            fontWeight: 700,
                                            color: "white",
                                            fontSize: "0.80rem",
                                            px: 2,
                                            py: 1.2,
                                            bgcolor: "#1a1a2e",
                                        }}
                                    >
                                        Edit
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            fontWeight: 700,
                                            color: "white",
                                            fontSize: "0.80rem",
                                            px: 2,
                                            py: 1.2,
                                            bgcolor: "#1a1a2e",
                                        }}
                                    >
                                        Delete
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {sortedTenants.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                                            <Typography variant="body1" color="text.secondary">
                                                No tenants available.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    sortedTenants.map((tenant) => (
                                        <TableRow
                                            key={tenant.id}
                                            hover
                                            sx={{
                                                "&.MuiTableRow-hover:hover": { bgcolor: "#f1f5f9" },
                                                "& td": { borderBottom: "1px solid #f1f5f9" },
                                            }}
                                        >
                                            <TableCell sx={{ py: 0.8, px: 2 }}>
                                                {tenant.logo_url ? (
                                                    <img
                                                        src={tenant.logo_url}
                                                        alt={tenant.name}
                                                        style={{
                                                            height: 32,
                                                            width: "auto",
                                                            maxWidth: 90,
                                                            objectFit: "contain",
                                                        }}
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = "none";
                                                        }}
                                                    />
                                                ) : (
                                                    <Typography sx={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                                                        —
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell
                                                sx={{
                                                    fontWeight: 700,
                                                    color: "#1a1a2e",
                                                    py: 0.8,
                                                    px: 2,
                                                    fontSize: "0.85rem",
                                                }}
                                            >
                                                {tenant.name}
                                            </TableCell>
                                            <TableCell sx={{ color: "#475569", py: 0.8, px: 2, fontSize: "0.85rem" }}>
                                                {tenant.owner_name}
                                            </TableCell>
                                            <TableCell sx={{ color: "#475569", py: 0.8, px: 2, fontSize: "0.85rem" }}>
                                                {tenant.email}
                                            </TableCell>
                                            <TableCell sx={{ py: 0.8, px: 2 }}>
                                                <Box
                                                    sx={{
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        gap: 1,
                                                        px: 1.2,
                                                        py: 0.35,
                                                        borderRadius: "20px",
                                                        bgcolor: tenant.is_active
                                                            ? "rgba(16, 185, 129, 0.1)"
                                                            : "rgba(239, 68, 68, 0.1)",
                                                        color: tenant.is_active ? "#059669" : "#dc2626",
                                                        border: `1px solid ${tenant.is_active
                                                            ? "rgba(16, 185, 129, 0.2)"
                                                            : "rgba(239, 68, 68, 0.2)"
                                                            }`,
                                                    }}
                                                >
                                                    <Box
                                                        sx={{
                                                            width: 5,
                                                            height: 5,
                                                            borderRadius: "50%",
                                                            bgcolor: "currentColor",
                                                        }}
                                                    />
                                                    <Typography
                                                        sx={{
                                                            fontWeight: 700,
                                                            fontSize: "0.7rem",
                                                            textTransform: "uppercase",
                                                            letterSpacing: "0.5px",
                                                        }}
                                                    >
                                                        {tenant.is_active ? "Active" : "Inactive"}
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell sx={{ color: "#475569", py: 0.8, px: 2, fontSize: "0.85rem" }}>
                                                {tenant.created_at && !isNaN(new Date(tenant.created_at).getTime())
                                                    ? new Date(tenant.created_at).toLocaleDateString("en-US", {
                                                        month: "short",
                                                        day: "2-digit",
                                                        year: "numeric",
                                                    })
                                                    : "-"}
                                            </TableCell>
                                            <TableCell sx={{ py: 0.8, px: 2 }}>
                                                <Tooltip title="Edit">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => navigate(`/tenants/${tenant.id}/edit`)}
                                                        sx={{
                                                            color: "#94a3b8",
                                                            "&:hover": { color: "#1713eaff" },
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
                                                            "&:hover": { color: "#ef4444" },
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

                {!loading && tenants.length > 0 && (
                    <TablePaginationBar
                        page={page}
                        rowsPerPage={rowsPerPage}
                        totalRows={totalTenants}
                        onPageChange={setPage}
                        onRowsPerPageChange={(v) => {
                            setRowsPerPage(v);
                            setPage(0);
                        }}
                    />
                )}

            <ConfirmDialog
                open={confirmDialogOpen}
                title="Confirm Delete"
                message={`Are you sure you want to delete tenant ${tenantToDelete?.name ?? ""}?`}
                confirmText={deleteLoading ? "Deleting…" : "Confirm"}
                onConfirm={handleConfirmDelete}
                onCancel={() => setConfirmDialogOpen(false)}
                loading={deleteLoading}
            />

            <Snackbar
                open={!!snackbar}
                autoHideDuration={3000}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
                onClose={() => setSnackbar(null)}
            >
                <Alert onClose={() => setSnackbar(null)} severity="success" sx={{ width: "100%" }}>
                    {snackbar}
                </Alert>
            </Snackbar>
        </ListPageLayout>
    );
};

export default TenantList;
