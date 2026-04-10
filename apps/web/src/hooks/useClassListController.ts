import { useState, useCallback, useMemo, useEffect } from "react";
import schoolClassService, { type SchoolClass } from "../api/services/schoolClassService";
import academicYearService from "../api/services/academicYearService";

export function useClassListController() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState<SchoolClass | null>(null);

  const [sortBy, setSortBy] = useState<"name" | "createdAt">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [academicYearFilter, setAcademicYearFilter] = useState("");
  const [academicYearOptions, setAcademicYearOptions] = useState<{ label: string; value: string }[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const classData = await schoolClassService.getAll({
        academic_year_id: academicYearFilter ? Number(academicYearFilter) : undefined,
      });
      setClasses(classData);
    } catch (err: any) {
      setError(err?.message || "Failed to fetch classes.");
    } finally {
      setLoading(false);
    }
  }, [academicYearFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    academicYearService
      .getAll()
      .then((data: any) => {
        const items = data?.data || data || [];
        setAcademicYearOptions(
          items.map((year: any) => ({
            label: year.name || year.code || String(year.id),
            value: String(year.id),
          }))
        );
      })
      .catch(() => {
        setAcademicYearOptions([]);
      });
  }, []);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(0);
  };

  const handleDeleteClick = (item: SchoolClass) => {
    setSelectedClass(item);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedClass) return;
    try {
      setDeleteLoading(true);
      setError(null);
      await schoolClassService.softDelete(selectedClass.id);
      setDeleteDialogOpen(false);
      setSelectedClass(null);
      setSuccess("Class deleted successfully!");
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || "Failed to delete class.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredClasses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return classes;
    return classes.filter(
      (item) =>
        `${item.name || ""}`.toLowerCase().includes(q) ||
        `${item.academic_year_name || ""}`.toLowerCase().includes(q) ||
        `${item.divisions?.map((division) => division.division_name).join(" ") || ""}`
          .toLowerCase()
          .includes(q)
    );
  }, [classes, search]);

  const sortedClasses = useMemo(() => {
    return [...filteredClasses].sort((a, b) => {
      const fieldA = a.name ?? "";
      const fieldB = b.name ?? "";
      return sortOrder === "asc"
        ? fieldA.localeCompare(fieldB)
        : fieldB.localeCompare(fieldA);
    });
  }, [filteredClasses, sortOrder]);

  const paginatedClasses = useMemo(() => {
    const start = page * rowsPerPage;
    return sortedClasses.slice(start, start + rowsPerPage);
  }, [sortedClasses, page, rowsPerPage]);

  return {
    // Data state
    classes: paginatedClasses,
    totalClasses: filteredClasses.length,
    loading,
    error,
    setError,
    success,
    setSuccess,
    
    // Pagination & Search & Sort
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
    academicYearFilter,
    setAcademicYearFilter,
    academicYearOptions,

    // Deletion state
    deleteDialogOpen,
    setDeleteDialogOpen,
    deleteLoading,
    selectedClass,
    handleDeleteClick,
    handleConfirmDelete,

    // Action handlers
    fetchData,
  };
}
