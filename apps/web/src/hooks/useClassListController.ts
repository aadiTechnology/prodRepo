import { useState, useCallback, useMemo, useEffect } from "react";
import { DEFAULT_LIST_ROWS_PER_PAGE } from "../utils/listPagination";
import schoolClassService, { type SchoolClass } from "../api/services/schoolClassService";
import academicYearService from "../api/services/academicYearService";
import { resolveCurrentAcademicYearId } from "../utils/academicYear";

function resolveApiErrorMessage(err: unknown, fallback: string): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: string };
    if (typeof first?.msg === "string") return first.msg;
  }
  const message = (err as { message?: string })?.message;
  return message || fallback;
}

export function useClassListController() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_LIST_ROWS_PER_PAGE);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState<SchoolClass | null>(null);

  const [sortBy, setSortBy] = useState<"name" | "createdAt">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [academicYearFilter, setAcademicYearFilter] = useState("");
  const [academicYearOptions, setAcademicYearOptions] = useState<{ label: string; value: string }[]>([]);
  const [academicYearFilterReady, setAcademicYearFilterReady] = useState(false);

  const fetchData = useCallback(async (opts?: { silent?: boolean }) => {
    if (!academicYearFilterReady) return;
    const silent = Boolean(opts?.silent);
    try {
      if (!silent) setLoading(true);
      setError(null);
      const classData = await schoolClassService.getAll({
        academic_year_id: academicYearFilter ? Number(academicYearFilter) : undefined,
        active_only: false,
      });
      setClasses(classData);
    } catch (err: any) {
      setError(err?.message || "Failed to fetch classes.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [academicYearFilter, academicYearFilterReady]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    academicYearService
      .listActive()
      .then((data: unknown) => {
        const items = (Array.isArray(data) ? data : (data as { data?: unknown[] })?.data) || [];
        const years = items as {
          id: number;
          name?: string;
          code?: string;
          is_current?: boolean | number;
          is_active?: boolean | number;
        }[];
        const options = years.map((year) => ({
          label: year.name || year.code || String(year.id),
          value: String(year.id),
        }));
        setAcademicYearOptions(options);
        const validIds = new Set(options.map((option) => option.value));
        setAcademicYearFilter((prev) => {
          if (prev && validIds.has(prev)) return prev;
          return resolveCurrentAcademicYearId(years);
        });
      })
      .catch(() => {
        setAcademicYearOptions([]);
      })
      .finally(() => {
        setAcademicYearFilterReady(true);
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
      setSuccess("Class deleted successfully.");
      await fetchData();
    } catch (err: unknown) {
      setDeleteDialogOpen(false);
      setError(resolveApiErrorMessage(err, "Failed to delete class."));
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
