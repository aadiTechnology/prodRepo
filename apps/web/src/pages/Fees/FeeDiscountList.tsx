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
    Edit as EditIcon,
    Delete as DeleteIcon,
} from "@mui/icons-material";
import feeDiscountService from "../../api/services/feeDiscountService";
import { useAuth } from "../../context/AuthContext";
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
    const { user } = useAuth();
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

    const fetchDiscounts = useCallback(async () => {
        try {
            setLoading(true);
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
            showSuccessToast("Discount deleted successfully");
            fetchDiscounts();
        } catch (err: any) {
            setError(err?.message || "Unable to delete discount. Please try again.");
        } finally {
            setDeleteLoading(false);
        }
    };

    // Table columns
    const columns = [
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
    ];

    // Calculate range for DirectoryInfoBar
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
                                onAddClick={() => { /* open create modal */ }}
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
                columns={columns}
                data={discounts as (FeeDiscount & Record<string, unknown>)[]}
                loading={loading}
                emptyMessage="No discounts available."
                renderRowActions={(row) => (
                    <TableRowActions
                        onEdit={() => { /* open edit modal */ }}
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
                message={`Are you sure you want to delete the discount ${discountToDelete?.discount_name}?`}
                confirmText={deleteLoading ? "Deleting..." : "Delete"}
                onConfirm={handleConfirmDelete}
                onCancel={() => setConfirmDialogOpen(false)}
                loading={deleteLoading}
            />
            <Snackbar
                open={!!snackbar}
                autoHideDuration={4000}
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

export default FeeDiscountList;
