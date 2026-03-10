import { useState, useEffect, useCallback, useMemo } from "react";
import {
    Box,
    Typography,
    Alert,
    CircularProgress,
    Snackbar,
    IconButton,
    Tooltip,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
    Home as HomeIcon,
    Login as LoginIcon,
} from "@mui/icons-material";
import { Tenant } from "../../types/tenant";
import tenantService from "../../api/services/tenantService";
import { useAuth } from "../../context/AuthContext";
import authService from "../../api/services/authService";
import { enqueueSnackbar } from "notistack";
import {
    ListPageLayout,
    ListPageToolbar,
    DirectoryInfoBar,
    DataTable,
    TableRowActions,
    TablePaginationBar
} from "../../components/reusable";
import { PageHeader } from "../../components/layout";
import StatusChip from "../../components/roles/StatusChip";
import ConfirmDialog from "../../components/common/ConfirmDialog";

const TenantList = () => {
    const navigate = useNavigate();
    const { user, applyLoginContextResponse } = useAuth();
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [impersonationLoading, setImpersonationLoading] = useState<number | null>(null);

    const [search, setSearch] = useState("");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalTenants, setTotalTenants] = useState(0);

    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const [snackbar, setSnackbar] = useState<string | null>(null);
    const showSuccessToast = (message: string) => setSnackbar(message);

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

    const handleLoginAsTenant = async (tenantId: number) => {
        try {
            setImpersonationLoading(tenantId);
            const adminUser = await tenantService.getTenantAdminUser(tenantId);
            const response = await authService.impersonate(adminUser.id);
            applyLoginContextResponse(response);
            enqueueSnackbar("Logged in as tenant successfully", { variant: "success" });
            navigate("/");
        } catch (error: any) {
            console.error('Failed to login as tenant:', error);
            enqueueSnackbar('Failed to login as tenant', { variant: 'error' });
        } finally {
            setImpersonationLoading(null);
        }
    };

    const isSystemAdmin = !user?.tenant_id;

    const filteredTenants = useMemo(() => {
        return [...tenants].sort((a, b) => {
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
    }, [tenants, sortBy, sortOrder]);

    const tenantColumns = useMemo(
        () => [
            {
                id: "logo",
                label: "Logo",
                render: (row: Tenant) => row.logo_url ? (
                    <img
                        src={row.logo_url}
                        alt={row.name}
                        style={{ height: 32, width: "auto", maxWidth: 90, objectFit: "contain" }}
                    />
                ) : "-"
            },
            { id: "name", label: "Tenant Name", field: "name" },
            { id: "owner_name", label: "Owner", field: "owner_name" },
            { id: "email", label: "Email", field: "email" },
            {
                id: "status",
                label: "Status",
                render: (row: Tenant) => <StatusChip status={row.is_active ? "ACTIVE" : "INACTIVE"} />
            },
            {
                id: "created_at",
                label: "Created Date",
                render: (row: Tenant) =>
                    row.created_at ? new Date(row.created_at).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" }) : "-"
            }
        ],
        []
    );

    const rangeStart = totalTenants > 0 ? Math.min(page * rowsPerPage + 1, totalTenants) : 0;
    const rangeEnd = Math.min((page + 1) * rowsPerPage, totalTenants);

    return (
        <ListPageLayout
            header={
                <>
                    <PageHeader
                        title="Tenant Management"
                        onBack={() => navigate("/")}
                        backIcon={<HomeIcon sx={{ fontSize: 24 }} />}
                        actions={
                            <ListPageToolbar
                                searchValue={search}
                                onSearchChange={setSearch}
                                searchPlaceholder="Search tenants..."
                                onAddClick={() => navigate("/tenants/add")}
                                addLabel="Add Tenant"
                            />
                        }
                    />
                    {error && (
                        <Alert severity="error" sx={{ m: 2 }} onClose={() => setError(null)}>
                            {error}
                        </Alert>
                    )}
                </>
            }
        >
            {!loading && totalTenants > 0 && (
                <DirectoryInfoBar
                    label="Tenant Directory"
                    rangeStart={rangeStart}
                    rangeEnd={rangeEnd}
                    total={totalTenants}
                />
            )}
            <DataTable<Tenant & Record<string, unknown>>
                columns={tenantColumns}
                data={filteredTenants as (Tenant & Record<string, unknown>)[]}
                loading={loading}
                emptyMessage="No tenants available."
                renderRowActions={(row) => (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <TableRowActions
                            onEdit={() => navigate(`/tenants/${row.id}/edit`)}
                            onDelete={() => handleDeleteClick(row)}
                        />
                        {isSystemAdmin && (
                            <Tooltip title="Login as this tenant">
                                <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() => handleLoginAsTenant(row.id)}
                                    disabled={impersonationLoading === row.id || !row.is_active}
                                >
                                    {impersonationLoading === row.id ? (
                                        <CircularProgress size={16} />
                                    ) : (
                                        <LoginIcon fontSize="small" />
                                    )}
                                </IconButton>
                            </Tooltip>
                        )}
                    </Box>
                )}
                stickyHeader
                size="small"
            />
            {!loading && totalTenants > 0 && (
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
                title="Please Confirm"
                message={`Are you sure you want to delete tenant ${tenantToDelete?.name}?`}
                confirmText={deleteLoading ? "Deleting..." : "Confirm"}
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
