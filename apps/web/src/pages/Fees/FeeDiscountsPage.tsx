import { useState, useEffect, useCallback, useMemo } from "react";
import {
    Box,
    Alert,
    Snackbar,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
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
import CreateDiscountDialog from "./CreateDiscountDialog";
import { Home as HomeIcon } from "@mui/icons-material";

const FeeDiscountsPage = () => {
    const navigate = useNavigate();
    const [discounts, setDiscounts] = useState<FeeDiscount[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [search, setSearch] = useState("");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalDiscounts, setTotalDiscounts] = useState(0);

    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [discountToDelete, setDiscountToDelete] = useState<FeeDiscount | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const [snackbar, setSnackbar] = useState<string | null>(null);
    const showSuccessToast = (message: string) => setSnackbar(message);

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    // Remove editDiscount state, not needed for page-based edit

    const fetchDiscounts = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await feeDiscountService.list({
                search: search || undefined,
                page: page + 1,
                page_size: rowsPerPage,
            });
            setDiscounts(data.data || data.items || []);
            setTotalDiscounts(data.total);
        } catch (err: any) {
            setError(err?.message || "Failed to fetch discounts.");
        } finally {
            setLoading(false);
        }
    }, [search, page, rowsPerPage]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchDiscounts();
        }, 500);
        return () => clearTimeout(timer);
    }, [fetchDiscounts]);

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
        navigate(`/fees/discounts/${discount.id}/edit`);
    };

    const handleCreateClick = () => {
        navigate("/fees/discounts/add");
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
                        title="Fee Discounts"
                        onBack={() => navigate("/")}
                        backIcon={<HomeIcon sx={{ fontSize: 24 }} />}
                        actions={
                            <ListPageToolbar
                                searchValue={search}
                                onSearchChange={setSearch}
                                searchPlaceholder="Search discounts by name"
                                onAddClick={handleCreateClick}
                                addLabel="Create Discount"
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
            {!loading && totalDiscounts > 0 && (
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
            {!loading && totalDiscounts > 0 && (
                <TablePaginationBar
                    page={page}
                    rowsPerPage={rowsPerPage}
                    totalRows={totalDiscounts}
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
                <Alert onClose={() => setSnackbar(null)} severity="success" sx={{ width: "100%" }}>
                    {snackbar}
                </Alert>
            </Snackbar>
        </ListPageLayout>
    );
};

export default FeeDiscountsPage;
