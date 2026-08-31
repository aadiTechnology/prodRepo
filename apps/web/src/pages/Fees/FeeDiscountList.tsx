import { useState, useEffect, useCallback } from "react";
import { DEFAULT_LIST_ROWS_PER_PAGE } from "../../utils/listPagination";
import { Alert, Snackbar } from "@mui/material";
import { useNavigate } from "react-router-dom";
import feeDiscountService from "../../api/services/feeDiscountService";
import {
  ListPageLayout,
  ListPageToolbar,
  DirectoryInfoBar,
  DataTable,
  TableRowActions,
  TablePaginationBar,
} from "../../components/reusable";
import { PageHeader } from "../../components/layout";
import StatusChip from "../../components/roles/StatusChip";
import ConfirmDialog from "../../components/common/ConfirmDialog";

// Types
export interface FeeDiscount {
    id: number;
    discount_name: string;
    discount_type: string;
    discount_value: number;
    category?: string;
    class_name?: string;
    status: boolean;
}

const FeeDiscountList = () => {
    const navigate = useNavigate();
    // Removed unused user variable
    const [discounts, setDiscounts] = useState<FeeDiscount[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [search, setSearch] = useState("");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_LIST_ROWS_PER_PAGE);
    const [totalDiscounts, setTotalDiscounts] = useState(0);

    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [discountToDelete, setDiscountToDelete] = useState<FeeDiscount | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const [snackbar, setSnackbar] = useState<string | null>(null);
    const showSuccessToast = (message: string) => setSnackbar(message);

    const fetchDiscounts = useCallback(async (opts?: { silent?: boolean }) => {
        const silent = Boolean(opts?.silent);
        try {
            if (!silent) setLoading(true);
            setError(null);
            const data = await feeDiscountService.list({
                search: search || undefined,
                page: page + 1,
                page_size: rowsPerPage,
            });
            setDiscounts(data.data);
            setTotalDiscounts(data.total);
        } catch (err: any) {
            setError(err?.message || "Unable to load discounts. Please try again.");
        } finally {
            if (!silent) setLoading(false);
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
            showSuccessToast("Discount deleted successfully");
            fetchDiscounts();
        } catch (err: any) {
            setError(err?.message || "Unable to delete discount. Please try again.");
            setConfirmDialogOpen(false); // Close dialog on error for better UX
        } finally {
            setDeleteLoading(false);
        }
    };

    // Table columns config extracted for reusability
    const getFeeDiscountColumns = () => ([
        { id: "discount_name", label: "Discount Name" },
        { id: "discount_type", label: "Type" },
        {
            id: "discount_value",
            label: "Value",
            render: (row: FeeDiscount) =>
                row.discount_type === "Percentage"
                    ? `${row.discount_value}%`
                    : row.discount_value,
        },
        { id: "category", label: "Category" },
        { id: "class_name", label: "Class" },
        {
            id: "status",
            label: "Status",
            render: (row: FeeDiscount) => (
                <StatusChip status={row.status ? "ACTIVE" : "INACTIVE"} />
            ),
        },
    ]);
    const columns = getFeeDiscountColumns();

    // Calculate range for DirectoryInfoBar
    const rangeStart = totalDiscounts > 0 ? Math.min(page * rowsPerPage + 1, totalDiscounts) : 0;
    const rangeEnd = Math.min((page + 1) * rowsPerPage, totalDiscounts);

    return (
        <ListPageLayout
          onRefresh={() => fetchDiscounts({ silent: true })}
            header={
                <>
                    <PageHeader
                        links={[{ title: "Fee Discounts", path: "#" }]}
                        homePath="/"
                        actions={
                            // Hide add button until implemented
                            null
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
                    label="Discounts"
                    rangeStart={rangeStart}
                    rangeEnd={rangeEnd}
                    total={totalDiscounts}
                />
            )}
            <DataTable<FeeDiscount>
                columns={columns}
                data={discounts}
                loading={loading}
                emptyMessage="No discounts available."
                renderRowActions={(row) => (
                    <TableRowActions
                        onEdit={() => navigate(`/fees/discounts/edit/${row.id}`)}
                        onDelete={() => handleDeleteClick(row)}
                    />
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
                title="Delete Discount"
                message={
                    error && confirmDialogOpen
                        ? error
                        : `Are you sure you want to delete the discount ${discountToDelete?.discount_name}?`
                }
                confirmText={deleteLoading ? "Deleting..." : "Delete"}
                onConfirm={handleConfirmDelete}
                onCancel={() => {
                    setConfirmDialogOpen(false);
                    setError(null);
                }}
                loading={deleteLoading}
            />
            <Snackbar
                open={!!snackbar}
                autoHideDuration={4000}
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

export default FeeDiscountList;
