import { useState, useCallback, useEffect } from "react";
import feeDiscountService from "../api/services/feeDiscountService";
import { type FeeDiscount } from "../types/feeDiscount";

export function useFeeDiscountListController() {
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

  const fetchFeeDiscounts = useCallback(async () => {
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
      setError(err?.message || "Failed to fetch fee discounts.");
    } finally {
      setLoading(false);
    }
  }, [search, page, rowsPerPage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFeeDiscounts();
    }, 500);
    return () => clearTimeout(timer);
  }, [fetchFeeDiscounts]);

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
      setSnackbar("Discount deleted successfully");
      fetchFeeDiscounts();
    } catch (err: any) {
      setError(err?.message || "Failed to delete discount.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return {
    discounts,
    loading,
    error,
    totalDiscounts,
    page,
    rowsPerPage,
    search,
    setSearch,
    setPage,
    setRowsPerPage,
    confirmDialogOpen,
    discountToDelete,
    deleteLoading,
    snackbar,
    setSnackbar,
    setConfirmDialogOpen,
    handleDeleteClick,
    handleConfirmDelete,
    fetchFeeDiscounts,
  };
}
