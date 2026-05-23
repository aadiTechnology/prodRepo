import { useState, useCallback, useMemo, useEffect } from "react";
import academicYearService, { type AcademicYear } from "../api/services/academicYearService";

export function useAcademicYearListController() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [entityToDelete, setEntityToDelete] = useState<AcademicYear | null>(null);

  const [sortBy, setSortBy] = useState<"name" | "start_date">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const fetchAcademicYears = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await academicYearService.getAll();
      setAcademicYears(data);
    } catch (err: any) {
      setError(err?.message || "Failed to fetch academic years.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAcademicYears();
  }, [fetchAcademicYears]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(0);
  };

  const handleDeleteClick = (academicYear: AcademicYear) => {
    setEntityToDelete(academicYear);
    setConfirmDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!entityToDelete) return;
    try {
      setDeleteLoading(true);
      setError(null);
      await academicYearService.softDelete(entityToDelete.id);
      setConfirmDialogOpen(false);
      setEntityToDelete(null);
      setSuccess("Academic year deleted successfully.");
      await fetchAcademicYears();
    } catch (err: any) {
      setError(err?.message || "Failed to delete academic year.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredAcademicYears = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return academicYears;
    return academicYears.filter(
      (item) =>
        `${item.name || ""}`.toLowerCase().includes(q) ||
        `${item.code || ""}`.toLowerCase().includes(q)
    );
  }, [academicYears, search]);

  const sortedAcademicYears = useMemo(() => {
    return [...filteredAcademicYears].sort((a, b) => {
      if (sortBy === "start_date") {
        const dateA = new Date(a.start_date || "").getTime();
        const dateB = new Date(b.start_date || "").getTime();
        const normalizedA = isNaN(dateA) ? 0 : dateA;
        const normalizedB = isNaN(dateB) ? 0 : dateB;
        return sortOrder === "asc" ? normalizedA - normalizedB : normalizedB - normalizedA;
      }
      const fieldA = a.name ?? "";
      const fieldB = b.name ?? "";
      return sortOrder === "asc" ? fieldA.localeCompare(fieldB) : fieldB.localeCompare(fieldA);
    });
  }, [filteredAcademicYears, sortBy, sortOrder]);

  const paginatedAcademicYears = useMemo(() => {
    const start = page * rowsPerPage;
    return sortedAcademicYears.slice(start, start + rowsPerPage);
  }, [sortedAcademicYears, page, rowsPerPage]);

  return {
    data: paginatedAcademicYears,
    loading,
    error,
    setError,
    success,
    setSuccess,
    totalRows: filteredAcademicYears.length,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    search,
    setSearch: handleSearchChange,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    confirmDialogOpen,
    setConfirmDialogOpen,
    deleteLoading,
    entityToDelete,
    handleDeleteClick,
    handleConfirmDelete,
    fetchAcademicYears,
  };
}
