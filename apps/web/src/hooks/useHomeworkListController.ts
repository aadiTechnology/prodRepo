import { useState, useEffect, useMemo } from "react";
import { homeworkService, type HomeworkResponse } from "../api/services/homeworkService";
import { academicYearService } from "../api/services/dropdownServices";
import { formatHomeworkClassLabel } from "../pages/academics/AddHomework.formConfig";
import { useAuth } from "../context/AuthContext";
import { useRBAC } from "../context/RBACContext";
import { isHomeworkReadOnlyAudience } from "../utils/homeworkAudience";
import { resolveCurrentAcademicYearId } from "../utils/academicYear";

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

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [divisionFilter, setDivisionFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [academicYearFilter, setAcademicYearFilter] = useState("");
  const [academicYearFilterReady, setAcademicYearFilterReady] = useState(false);

  const [classOptions, setClassOptions] = useState<{ label: string; value: string }[]>([]);
  const [divisionOptions, setDivisionOptions] = useState<{ label: string; value: string }[]>([]);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<HomeworkResponse | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (readOnlyAudience) {
      setAcademicYearFilterReady(true);
      return;
    }

    let cancelled = false;

    const loadFilters = async () => {
      try {
        const [classes, yearData] = await Promise.all([
          homeworkService.getTeacherClasses(),
          academicYearService.list(),
        ]);

        if (cancelled) return;

        setClassOptions(
          classes.map((c) => ({
            label: formatHomeworkClassLabel(c.name),
            value: String(c.id),
          })),
        );

        const yearsRaw =
          (Array.isArray(yearData) ? yearData : (yearData as { data?: unknown[] })?.data) ?? [];
        const years = yearsRaw as {
          id: number;
          is_current?: boolean | number;
          is_active?: boolean | number;
        }[];
        const currentYearId = resolveCurrentAcademicYearId(years);
        if (currentYearId) {
          setAcademicYearFilter(currentYearId);
        }
      } catch {
        if (!cancelled) {
          setError("Unable to load homework filters");
        }
      } finally {
        if (!cancelled) {
          setAcademicYearFilterReady(true);
        }
      }
    };

    void loadFilters();

    return () => {
      cancelled = true;
    };
  }, [readOnlyAudience]);

  useEffect(() => {
    if (readOnlyAudience || !classFilter) {
      setDivisionOptions([]);
      setDivisionFilter("");
      return;
    }

    let cancelled = false;

    homeworkService
      .getDivisionsForClass(Number(classFilter))
      .then((divisions) => {
        if (cancelled) return;
        setDivisionOptions(
          divisions.map((d) => ({
            label: formatHomeworkClassLabel(d.division_name),
            value: String(d.id),
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setDivisionOptions([]);
      });

    setDivisionFilter("");

    return () => {
      cancelled = true;
    };
  }, [classFilter, readOnlyAudience]);

  const fetchHomework = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await homeworkService.list({
        skip: page * rowsPerPage,
        limit: rowsPerPage,
        search: search || undefined,
        class_id: readOnlyAudience || !classFilter ? undefined : Number(classFilter),
        class_division_id:
          readOnlyAudience || !divisionFilter ? undefined : Number(divisionFilter),
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
  }, [
    page,
    rowsPerPage,
    search,
    statusFilter,
    classFilter,
    divisionFilter,
    subjectFilter,
    academicYearFilter,
    readOnlyAudience,
    academicYearFilterReady,
  ]);

  useEffect(() => {
    setPage(0);
  }, [search, statusFilter, classFilter, divisionFilter, subjectFilter, academicYearFilter]);

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
    divisionFilter,
    setDivisionFilter,
    subjectFilter,
    setSubjectFilter,
    classOptions,
    divisionOptions,
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
