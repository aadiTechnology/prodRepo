/**
 * Fee Discounts Page - Manage fee discounts for the institution
 * Displays list of fee discounts with create, edit, and delete operations
 * Uses RBAC permissions for managing discount access
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { DEFAULT_LIST_ROWS_PER_PAGE, LIST_ROWS_PER_PAGE_OPTIONS, shouldShowStandardListPagination } from "../../utils/listPagination";
import {
    Box,
    Alert,
    Snackbar,
    Select,
    MenuItem,
    Typography,
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import academicYearService from "../../api/services/academicYearService";
import { resolveCurrentAcademicYearId } from "../../utils/academicYear";
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
import feeDiscountService from "../../api/services/feeDiscountService";
import { FeeDiscount } from "../../types/feeDiscount";
import { useConfigHubNavigation } from "../../hooks/useConfigHubNavigation";
import CreateDiscountDialog from "./CreateDiscountDialog";

// ═══════════════════════════════════════════════════════════════════════════
// Fee Discounts Page Component
// ═══════════════════════════════════════════════════════════════════════════
const FeeDiscountsPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { buildListBreadcrumbs, navigateWithConfigHub } = useConfigHubNavigation();
    const [discounts, setDiscounts] = useState<FeeDiscount[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const breadcrumbLinks = buildListBreadcrumbs("Fee Discounts");

    const [search, setSearch] = useState("");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_LIST_ROWS_PER_PAGE);
    const [totalDiscounts, setTotalDiscounts] = useState(0);

    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [discountToDelete, setDiscountToDelete] = useState<FeeDiscount | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const [snackbar, setSnackbar] = useState<string | null>(null);
    const showSuccessToast = (message: string) => setSnackbar(message);

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [academicYears, setAcademicYears] = useState<{ id: number; name: string }[]>([]);
    const [academicYearId, setAcademicYearId] = useState("");
    const [academicYearReady, setAcademicYearReady] = useState(false);

    useEffect(() => {
        academicYearService
            .listActive()
            .then((years) => {
                setAcademicYears(years.map((y) => ({ id: y.id, name: y.name })));
                const fromNav = (location.state as { academic_year_id?: string } | null)?.academic_year_id;
                const defaultId = fromNav || resolveCurrentAcademicYearId(years);
                setAcademicYearId((prev) => prev || defaultId);
                setAcademicYearReady(true);
            })
            .catch(() => setAcademicYearReady(true));
    }, [location.key, location.state]);

    useEffect(() => {
        const ayId = (location.state as { academic_year_id?: string } | null)?.academic_year_id;
        if (ayId) setAcademicYearId(ayId);
    }, [location.key, location.state]);
    // Remove editDiscount state, not needed for page-based edit

    const fetchDiscounts = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await feeDiscountService.list({
                search: search || undefined,
                page: page + 1,
                page_size: rowsPerPage,
                academic_year_id: academicYearId ? Number(academicYearId) : undefined,
            });
            setDiscounts(data.data || data.items || []);
            setTotalDiscounts(data.total);
        } catch (err: any) {
            setError(err?.message || "Failed to fetch discounts.");
        } finally {
            setLoading(false);
        }
    }, [search, page, rowsPerPage, academicYearId]);

    useEffect(() => {
        if (!academicYearReady) return;
        const timer = setTimeout(() => {
            fetchDiscounts();
        }, 500);
        return () => clearTimeout(timer);
    }, [fetchDiscounts, academicYearReady]);

    const handleDeleteClick = (discount: FeeDiscount) => {
        setDiscountToDelete(discount);
        setConfirmDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!discountToDelete) return;
        try {
            setDeleteLoading(true);
            await feeDiscountService.delete(discountToDelete.id);
            setConfirmDialogOpen(false);
            setDiscountToDelete(null);
            showSuccessToast("Discount rule deleted successfully");
            fetchDiscounts();
        } catch (err: any) {
            setError(err?.message || "Failed to delete discount.");
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleEditClick = (discount: FeeDiscount) => {
        navigateWithConfigHub(`/fees/discounts/${discount.id}/edit`);
    };

    const handleCreateClick = () => {
        navigateWithConfigHub("/fees/discounts/add", {
            state: { academic_year_id: academicYearId || undefined },
        });
    };

    const handleDialogClose = (refresh = false) => {
        setCreateDialogOpen(false);
        if (refresh) fetchDiscounts();
    };

    const discountColumns = useMemo(
        () => [
            { id: "discount_name", label: "Discount Name", field: "discount_name" },
            { id: "discount_type", label: "Type", render: (row: FeeDiscount) => row.discount_type === "PERCENTAGE" ? "Percentage" : "Fixed Amount" },
            { id: "discount_value", label: "Value", render: (row: FeeDiscount) => row.discount_type === "PERCENTAGE" ? `${row.discount_value}%` : `₹${row.discount_value}` },
            { id: "fee_category", label: "Category", field: "fee_category" },
            { id: "applicable_class", label: "Class", field: "applicable_class" },
            { id: "status", label: "Status", render: (row: FeeDiscount) => <StatusChip status={row.status ? "ACTIVE" : "INACTIVE"} /> },
        ],
        []
    );

    const rangeStart = totalDiscounts > 0 ? Math.min(page * rowsPerPage + 1, totalDiscounts) : 0;
    const rangeEnd = Math.min((page + 1) * rowsPerPage, totalDiscounts);

    return (
        <ListPageLayout
            header={
                <>
                    <PageHeader
                        links={breadcrumbLinks}
                        homePath="/"
                        actions={
                            <ListPageToolbar
                                searchValue={search}
                                onSearchChange={setSearch}
                                searchPlaceholder="Search discounts by name"
                                onAddClick={handleCreateClick}
                                addLabel="Create Discount"
                                renderActions={
                                    <Select
                                        value={academicYearId}
                                        onChange={(e) => {
                                            setAcademicYearId(e.target.value);
                                            setPage(0);
                                        }}
                                        displayEmpty
                                        size="small"
                                        sx={{
                                            minWidth: { xs: "100%", sm: 180 },
                                            "& .MuiOutlinedInput-root": {
                                                borderRadius: "15px",
                                                fontSize: "0.85rem",
                                                fontWeight: 600,
                                            },
                                        }}
                                    >
                                        <MenuItem value="">
                                            <Typography variant="body2" color="text.secondary">
                                                Academic Year
                                            </Typography>
                                        </MenuItem>
                                        {academicYears.map((ay) => (
                                            <MenuItem key={ay.id} value={String(ay.id)}>
                                                {ay.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                }
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
            {!loading && shouldShowStandardListPagination(totalDiscounts) && (
                <DirectoryInfoBar
                    label="Tenant Scope"
                    rangeStart={rangeStart}
                    rangeEnd={rangeEnd}
                    total={totalDiscounts}
                />
            )}
            <DataTable<FeeDiscount & Record<string, unknown>>
                columns={discountColumns}
                data={discounts as (FeeDiscount & Record<string, unknown>)[]}
                loading={loading}
                emptyMessage="No discounts configured yet"
                renderRowActions={(row) => (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <TableRowActions
                            onEdit={() => handleEditClick(row)}
                            onDelete={() => handleDeleteClick(row)}
                        />
                    </Box>
                )}
                stickyHeader
                size="small"
            />
            {!loading && shouldShowStandardListPagination(totalDiscounts) && (
                <TablePaginationBar
                    page={page}
                    rowsPerPage={rowsPerPage}
                    totalRows={totalDiscounts}
                    onPageChange={setPage}
                    onRowsPerPageChange={(v) => {
                        setRowsPerPage(v);
                        setPage(0);
                    }}
                    rowsPerPageOptions={LIST_ROWS_PER_PAGE_OPTIONS}
                />
            )}

            <ConfirmDialog
                open={confirmDialogOpen}
                title="Please Confirm"
                message={`Are you sure you want to delete discount ${discountToDelete?.discount_name}?`}
                confirmText={deleteLoading ? "Deleting..." : "Confirm"}
                onConfirm={handleConfirmDelete}
                onCancel={() => setConfirmDialogOpen(false)}
                loading={deleteLoading}
            />

            <CreateDiscountDialog
                open={createDialogOpen}
                onClose={handleDialogClose}
                // Only use for creation, not editing
                onSuccess={() => {
                    showSuccessToast("Discount rule created successfully");
                    handleDialogClose(true);
                }}
            />

            <Snackbar
                open={!!snackbar}
                autoHideDuration={3000}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
                onClose={() => setSnackbar(null)}
            >
                <Alert
                    onClose={() => setSnackbar(null)}
                    severity="success"
                    variant="filled"
                    sx={{ width: "100%", borderRadius: "12px" }}
                >
                    {snackbar}
                </Alert>
            </Snackbar>
        </ListPageLayout>
    );
};

export default FeeDiscountsPage;
