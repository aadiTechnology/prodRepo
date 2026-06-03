import { useState, useEffect, useMemo } from "react";
import { homeworkService, type HomeworkResponse } from "../api/services/homeworkService";
import { academicYearService } from "../api/services/dropdownServices";
import { useAuth } from "../context/AuthContext";
import { useRBAC } from "../context/RBACContext";
import { isHomeworkReadOnlyAudience } from "../utils/homeworkAudience";

const resolveCurrentAcademicYearId = (
  years: { id: number; is_current?: boolean | number; is_active?: boolean | number }[]
): string => {
  const current =
    years.find((y) => y.is_current === true || y.is_current === 1) ??
    years.find((y) => y.is_active === true || y.is_active === 1) ??
    years[0];
  return current?.id != null ? String(current.id) : "";
};

export function useHomeworkListController() {
  const { user } = useAuth();
  const { roles } = useRBAC();
  const readOnlyAudience = useMemo(
    () => isHomeworkReadOnlyAudience(user?.role, roles),
    [user?.role, roles],
  );
  const [homework, setHomework] = useState<HomeworkResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [total, setTotal] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [academicYearFilter, setAcademicYearFilter] = useState("");
  const [academicYearFilterReady, setAcademicYearFilterReady] = useState(false);

  // Dropdown options
  const [classOptions, setClassOptions] = useState<{ label: string; value: string }[]>([]);
  const [academicYearOptions, setAcademicYearOptions] = useState<{ label: string; value: string }[]>([]);

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<HomeworkResponse | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Admin/teacher filters — students and parents are scoped on the server
  useEffect(() => {
    if (readOnlyAudience) {
      setAcademicYearFilterReady(true);
      return;
    }

    homeworkService.getTeacherClasses()
      .then((classes) => {
        setClassOptions(classes.map((c) => ({ label: c.name, value: String(c.id) })));
      })
      .catch(() => {});

    academicYearService.list()
      .then((data: unknown) => {
        const yearsRaw =
          (Array.isArray(data) ? data : (data as { data?: unknown[] })?.data) ?? [];
        const years = yearsRaw as {
          id: number;
          name?: string;
          code?: string;
          is_current?: boolean | number;
          is_active?: boolean | number;
        }[];
        setAcademicYearOptions(
          years.map((y: any) => ({ label: y.name || y.code, value: String(y.id) })),
        );
        setAcademicYearFilter((prev) => prev || resolveCurrentAcademicYearId(years));
      })
      .catch(() => {})
      .finally(() => {
        setAcademicYearFilterReady(true);
      });
  }, [readOnlyAudience]);

  const fetchHomework = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await homeworkService.list({
        skip: page * rowsPerPage,
        limit: rowsPerPage,
        search: search || undefined,
        class_id: readOnlyAudience || !classFilter ? undefined : Number(classFilter),
        academic_year_id:
          readOnlyAudience || !academicYearFilter ? undefined : Number(academicYearFilter),
        status: readOnlyAudience
          ? "Published"
          : (statusFilter as "Draft" | "Published") || undefined,
      });
      setHomework(response.data);
      setTotal(response.total);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Unable to load homework list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!readOnlyAudience && !academicYearFilterReady) return;
    fetchHomework();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, search, statusFilter, classFilter, subjectFilter, academicYearFilter, readOnlyAudience, academicYearFilterReady]);

  // Reset to page 0 when filters change
  useEffect(() => {
    setPage(0);
  }, [search, statusFilter, classFilter, subjectFilter, academicYearFilter]);

  const handleDeleteClick = (row: HomeworkResponse) => {
    setSelectedRow(row);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedRow) return;
    try {
      setDeleteLoading(true);
      await homeworkService.delete(selectedRow.id);
      setSuccess("Homework deleted successfully");
      setDeleteDialogOpen(false);
      fetchHomework();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Unable to delete homework");
      setDeleteDialogOpen(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  return {
    homework,
    loading,
    error,
    setError,
    success,
    setSuccess,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    total,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    classFilter,
    setClassFilter,
    subjectFilter,
    setSubjectFilter,
    academicYearFilter,
    setAcademicYearFilter,
    classOptions,
    academicYearOptions,
    deleteDialogOpen,
    setDeleteDialogOpen,
    selectedRow,
    handleDeleteClick,
    handleConfirmDelete,
    deleteLoading,
    statusOptions: [
      { label: "Draft", value: "Draft" },
      { label: "Published", value: "Published" },
    ],
    readOnlyAudience,
  };
}
