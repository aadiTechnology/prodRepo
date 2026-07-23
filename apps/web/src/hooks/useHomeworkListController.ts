import { useState, useEffect, useMemo } from "react";
import { DEFAULT_LIST_ROWS_PER_PAGE } from "../utils/listPagination";
import { homeworkService, type HomeworkResponse } from "../api/services/homeworkService";
import { academicYearService } from "../api/services/dropdownServices";
import { formatHomeworkClassLabel } from "../pages/academics/AddHomework.formConfig";
import { useAuth } from "../context/AuthContext";
import { useRBAC } from "../context/RBACContext";
import { isHomeworkReadOnlyAudience } from "../utils/homeworkAudience";
import {
  homeworkEditDeleteLockMessage,
  isHomeworkEditDeleteAllowed,
} from "../utils/homeworkEditWindow";
import { isTeacherNoticeUser } from "../utils/noticeAudience";
import { resolveCurrentAcademicYearId } from "../utils/academicYear";
import { HOMEWORK_STATUS_ACTIVE } from "../utils/homeworkStatus";
import { notifyHomeworkUnreadChanged } from "../utils/homeworkUnreadEvents";

export function useHomeworkListController() {
  const { user } = useAuth();
  const { roles, hasAnyRole } = useRBAC();
  const readOnlyAudience = useMemo(
    () => isHomeworkReadOnlyAudience(user?.role, roles),
    [user?.role, roles],
  );
  const isTeacherScoped = useMemo(() => {
    const isAdminLike = hasAnyRole(["ADMIN", "SUPER_ADMIN", "SYSTEM_ADMIN"]);
    return !readOnlyAudience && !isAdminLike && isTeacherNoticeUser(user?.role, roles);
  }, [hasAnyRole, readOnlyAudience, roles, user?.role]);
  const [homework, setHomework] = useState<HomeworkResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_LIST_ROWS_PER_PAGE);
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
  const [teacherFiltersReady, setTeacherFiltersReady] = useState(!isTeacherScoped);

  const lockClassFilter = isTeacherScoped && classOptions.length <= 1;
  const lockDivisionFilter = isTeacherScoped && divisionOptions.length <= 1;

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

        const nextClassOptions = classes.map((c) => ({
          label: formatHomeworkClassLabel(c.name),
          value: String(c.id),
        }));
        setClassOptions(nextClassOptions);

        if (isTeacherScoped && nextClassOptions.length > 0) {
          setClassFilter(nextClassOptions[0].value);
        } else {
          setTeacherFiltersReady(true);
        }

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
          setTeacherFiltersReady(true);
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
  }, [readOnlyAudience, isTeacherScoped]);

  useEffect(() => {
    if (!isTeacherScoped) {
      setTeacherFiltersReady(true);
    }
  }, [isTeacherScoped]);

  useEffect(() => {
    if (readOnlyAudience || !classFilter) {
      setDivisionOptions([]);
      setDivisionFilter("");
      if (isTeacherScoped) {
        setTeacherFiltersReady(false);
      }
      return;
    }

    if (isTeacherScoped) {
      setTeacherFiltersReady(false);
    }

    let cancelled = false;

    homeworkService
      .getDivisionsForClass(Number(classFilter))
      .then((divisions) => {
        if (cancelled) return;
        const nextDivisionOptions = divisions.map((d) => ({
          label: formatHomeworkClassLabel(d.division_name),
          value: String(d.id),
        }));
        setDivisionOptions(nextDivisionOptions);
        if (isTeacherScoped) {
          setDivisionFilter(nextDivisionOptions[0]?.value ?? "");
          setTeacherFiltersReady(true);
        } else {
          setDivisionFilter("");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDivisionOptions([]);
          if (isTeacherScoped) {
            setDivisionFilter("");
            setTeacherFiltersReady(true);
          } else {
            setDivisionFilter("");
          }
        }
      });

    return () => {
      cancelled = true;
    };
  }, [classFilter, readOnlyAudience, isTeacherScoped]);

  const fetchHomework = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await homeworkService.list({
        skip: readOnlyAudience ? 0 : page * rowsPerPage,
        limit: readOnlyAudience ? 200 : rowsPerPage,
        search: search || undefined,
        class_id: readOnlyAudience || !classFilter ? undefined : Number(classFilter),
        class_division_id:
          readOnlyAudience || !divisionFilter ? undefined : Number(divisionFilter),
        academic_year_id:
          readOnlyAudience || !academicYearFilter ? undefined : Number(academicYearFilter),
        status: readOnlyAudience
          ? HOMEWORK_STATUS_ACTIVE
          : (statusFilter as "Draft" | "Active") || undefined,
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
    if (isTeacherScoped && !teacherFiltersReady) return;
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
    isTeacherScoped,
    teacherFiltersReady,
  ]);

  useEffect(() => {
    setPage(0);
  }, [search, statusFilter, classFilter, divisionFilter, subjectFilter, academicYearFilter]);

  // Refresh sidebar badge after list filter load; do not push class/division
  // into the badge (that made login count wrong until this page was opened).
  useEffect(() => {
    if (!academicYearFilterReady) return;
    if (isTeacherScoped && !teacherFiltersReady) return;
    notifyHomeworkUnreadChanged();
  }, [academicYearFilterReady, isTeacherScoped, teacherFiltersReady]);

  const handleDeleteClick = (row: HomeworkResponse) => {
    if (!isHomeworkEditDeleteAllowed(row)) {
      setError(homeworkEditDeleteLockMessage());
      return;
    }
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
      notifyHomeworkUnreadChanged();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Unable to delete homework");
      setDeleteDialogOpen(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const tableLoading = loading && homework.length === 0;

  return {
    homework,
    loading,
    tableLoading,
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
      { label: "Published", value: "Active" },
    ],
    readOnlyAudience,
    isTeacherScoped,
    lockClassFilter,
    lockDivisionFilter,
  };
}
