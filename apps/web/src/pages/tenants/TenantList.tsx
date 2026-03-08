import { useState, useEffect, useCallback, useMemo } from "react";
import {
    Box,
    Typography,
    Alert,
    CircularProgress,
    Snackbar,
} from "@mui/material";
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Home as HomeIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { Tenant } from "../../types/tenant";
import tenantService from "../../api/services/tenantService";
import { ListPageLayout, ListPageToolbar, DirectoryInfoBar, TablePaginationBar, DataTable, TableRowActions } from "../../components/reusable";
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

    const tenantColumns = useMemo(
        () => [
            {
                id: "logo",
                label: "Logo",
                render: (t: Tenant) =>
                    t.logo_url ? (
                        <img
                            src={t.logo_url}
                            alt={t.name}
                            style={{ height: 32, width: "auto", maxWidth: 90, objectFit: "contain" }}
                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                        />
                    ) : (
                        <Typography sx={{ fontSize: "0.85rem", color: "#94a3b8" }}>—</Typography>
                    ),
            },
            { id: "name", label: "Tenant Name", field: "name" as keyof Tenant, render: (t: Tenant) => t.name },
            { id: "owner_name", label: "Owner", field: "owner_name" as keyof Tenant },
            { id: "email", label: "Email", field: "email" as keyof Tenant },
            {
                id: "status",
                label: "Status",
                render: (t: Tenant) => (
                    <Box
                        sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 1,
                            px: 1.2,
                            py: 0.35,
                            borderRadius: "20px",
                            bgcolor: t.is_active ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                            color: t.is_active ? "#059669" : "#dc2626",
                            border: `1px solid ${t.is_active ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"}`,
                        }}
                    >
                        <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: "currentColor" }} />
                        <Typography sx={{ fontWeight: 700, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            {t.is_active ? "Active" : "Inactive"}
                        </Typography>
                    </Box>
                ),
            },
            {
                id: "created_at",
                label: "Created Date",
                render: (t: Tenant) =>
                    t.created_at && !isNaN(new Date(t.created_at).getTime())
                        ? new Date(t.created_at).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
                        : "-",
            },
        ],
        []
    );

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

                <DataTable<Tenant & Record<string, unknown>>
                    columns={tenantColumns}
                    data={sortedTenants as (Tenant & Record<string, unknown>)[]}
                    loading={loading}
                    emptyMessage="No tenants available."
                    renderRowActions={(tenant) => (
                        <TableRowActions
                            onEdit={() => navigate(`/tenants/${tenant.id}/edit`)}
                            onDelete={() => handleDeleteClick(tenant)}
                        />
                    )}
                    stickyHeader
                    size="small"
                    maxHeight="calc(100vh - 200px)"
                />

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
