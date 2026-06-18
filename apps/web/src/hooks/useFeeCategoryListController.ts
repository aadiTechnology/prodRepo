import { useState, useCallback, useEffect, useMemo } from "react";
import { DEFAULT_LIST_ROWS_PER_PAGE } from "../utils/listPagination";
import { getFeeCategories, deleteFeeCategory, getAcademicYears } from "../api/services/feeService";
import schoolClassService from "../api/services/schoolClassService";
import type { FeeCategoryResponse } from "../types/fee";
import { useListManager } from "./useListManager";

const resolveCurrentAcademicYearId = (
  years: { id: number; is_current?: boolean | number }[]
): string => {
  const current =
    years.find((y) => y.is_current === true || y.is_current === 1) ?? years[0];
  return current?.id != null ? String(current.id) : "";
};

export function useFeeCategoryListController() {
  const [categories, setCategories] = useState<FeeCategoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<FeeCategoryResponse | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const [academicYears, setAcademicYears] = useState<
    { id: number; name: string; is_current?: boolean | number }[]
  >([]);
  const [uniqueClasses, setUniqueClasses] = useState<{ id: number; name: string }[]>([]);

  const listState = useListManager<{ className: string; academicYearId: string }, "name">({
    initialFilters: { className: "", academicYearId: "" },
    initialSortBy: "name",
    initialSortOrder: "asc",
    initialRowsPerPage: DEFAULT_LIST_ROWS_PER_PAGE,
    initialPage: 0,
    initialSearch: "",
  });

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [data, years, cls] = await Promise.all([
        getFeeCategories(),
        getAcademicYears(),
        schoolClassService.getAll()
      ]);
      setCategories(data || []);
      const yearOptions = (years || []).map(
        (y: { id: number; name: string; is_current?: boolean | number }) => ({
          id: y.id,
          name: y.name,
          is_current: y.is_current,
        })
      );
      setAcademicYears(yearOptions);
      setUniqueClasses((cls || []).map((c: any) => ({ id: c.id, name: c.name })));

      const currentYearId = resolveCurrentAcademicYearId(yearOptions);
      if (currentYearId && listState.filters.academicYearId === "") {
        listState.setFilter("academicYearId", currentYearId);
      }
    } catch (err: any) {
      setError(err?.message || err?.detail || "Failed to fetch categories.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleDeleteClick = (category: FeeCategoryResponse) => {
    setCategoryToDelete(category);
    setConfirmDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;
    try {
      setDeleteLoading(true);
      await deleteFeeCategory(categoryToDelete.id);
      setConfirmDialogOpen(false);
      setCategoryToDelete(null);
      setSnackbar("Fee category deleted successfully");
      fetchCategories();
    } catch (err: any) {
      setError(err?.message || err?.detail || "Failed to delete category.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      const matchesSearch =
        listState.search === "" ||
        cat.name.toLowerCase().includes(listState.search.toLowerCase()) ||
        String(cat.id).includes(listState.search);

      const matchesClass =
        listState.filters.className === "" || cat.class_name === listState.filters.className;

      const matchesYear =
        listState.filters.academicYearId === "" ||
        String(cat.academic_year_id) === listState.filters.academicYearId;

      return matchesSearch && matchesClass && matchesYear;
    });
  }, [categories, listState.search, listState.filters]);

  const sortedCategories = useMemo(() => {
    return [...filteredCategories].sort((a, b) => {
      const aVal = a.name.toLowerCase();
      const bVal = b.name.toLowerCase();
      if (aVal < bVal) return listState.sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return listState.sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredCategories, listState.sortOrder]);

  const paginatedCategories = useMemo(() => {
    return sortedCategories.slice(
      listState.page * listState.rowsPerPage,
      (listState.page + 1) * listState.rowsPerPage
    );
  }, [listState.page, listState.rowsPerPage, sortedCategories]);

  return {
    listState,
    categories,
    filteredCategories,
    paginatedCategories,
    academicYears,
    uniqueClasses,
    loading,
    error,
    setError,
    confirmDialogOpen,
    setConfirmDialogOpen,
    deleteLoading,
    snackbar,
    setSnackbar,
    handleDeleteClick,
    handleConfirmDelete,
    fetchCategories,
  };
}
