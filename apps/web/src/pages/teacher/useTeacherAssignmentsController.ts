import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import teacherAssignmentApi, {
  type TeacherAssignmentApiItem,
} from "../../api/teacherAssignmentApi";

export type TeacherAssignmentRow = {
  id: number;
  academicYearId: number | null;
  classId: number | null;
  classDivisionId: number | null;
  classDivisionIds: number[];
  class: string;
  division: string;
  teacherId: number | null;
  teacherName: string | null;
  status: "ASSIGNED" | "NOT_ASSIGNED";
};

export type TeacherAssignmentsSnackbarSeverity = "success" | "error";

export function useTeacherAssignmentsController() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [snackbarSeverity, setSnackbarSeverity] = useState<TeacherAssignmentsSnackbarSeverity>("success");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<TeacherAssignmentRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["teacher-assignments", page, rowsPerPage, debouncedSearch],
    queryFn: () =>
      teacherAssignmentApi.getTeacherAssignments({
        page: page + 1,
        limit: rowsPerPage,
        search: debouncedSearch || undefined,
      }),
  });

  const rows = useMemo<TeacherAssignmentRow[]>(
    () =>
      (data?.data || []).map((item: TeacherAssignmentApiItem) => ({
        id: item.id,
        academicYearId: item.academic_year_id,
        classId: item.class_id,
        classDivisionId: item.class_division_id,
        classDivisionIds: item.class_division_ids || (item.class_division_id ? [item.class_division_id] : []),
        class: item.class_name || "-",
        division: item.division_name || "-",
        teacherId: item.teacher_id,
        teacherName: item.teacher_name,
        status: item.status,
      })),
    [data]
  );

  const openDeleteConfirm = (row: TeacherAssignmentRow) => {
    setRowToDelete(row);
    setConfirmDialogOpen(true);
  };

  const closeDeleteConfirm = () => {
    setConfirmDialogOpen(false);
    setRowToDelete(null);
  };

  const confirmDelete = async () => {
    if (!rowToDelete?.id) return;
    setDeleteLoading(true);
    try {
      const response = await teacherAssignmentApi.unassignTeacher(rowToDelete.id);
      await refetch();
      setSnackbarSeverity("success");
      setSnackbar(response.message || "Teacher assignment deleted successfully.");
      closeDeleteConfirm();
    } catch {
      setSnackbarSeverity("error");
      setSnackbar("Failed to delete teacher assignment.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return {
    navigate,
    search,
    setSearch,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    snackbar,
    snackbarSeverity,
    setSnackbar,
    setSnackbarSeverity,
    confirmDialogOpen,
    rowToDelete,
    deleteLoading,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
    rows,
    totalRows: data?.pagination.total || 0,
    openDeleteConfirm,
    closeDeleteConfirm,
    confirmDelete,
  };
}

