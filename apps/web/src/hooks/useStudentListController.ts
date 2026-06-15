import { useCallback, useEffect, useMemo, useState } from "react";
import { enqueueSnackbar } from "notistack";
import type { NavigateFunction } from "react-router-dom";
import studentService from "../api/services/studentService";
import type { Student } from "../types/student";
import { useListManager } from "./useListManager";

export type StudentListSortBy = "name" | "created_at";

type UseStudentListControllerOptions = {
  navigate: NavigateFunction;
  classFilter?: string;
  divisionFilter?: string;
  statusFilter?: string;
  /** When false, defers the initial fetch until filters are ready (e.g. teacher class scope). */
  ready?: boolean;
};

type UseStudentListControllerResult = {
  listState: ReturnType<typeof useListManager<Record<string, string>, StudentListSortBy>>;
  students: Student[];
  sortedStudents: Student[];
  totalStudents: number;
  loading: boolean;
  error: string | null;
  snackbar: string | null;
  confirmDialogOpen: boolean;
  studentToDelete: Student | null;
  deleteLoading: boolean;
  fetchStudents: () => Promise<void>;
  closeSnackbar: () => void;
  openDeleteConfirm: (student: Student) => void;
  closeDeleteConfirm: () => void;
  confirmDelete: () => Promise<void>;
};

export function useStudentListController({
  navigate,
  classFilter,
  divisionFilter,
  statusFilter,
  ready = true,
}: UseStudentListControllerOptions): UseStudentListControllerResult {
  const [students, setStudents] = useState<Student[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const listState = useListManager<Record<string, string>, StudentListSortBy>({
    initialFilters: {},
    initialSortBy: "created_at",
    initialSortOrder: "desc",
    initialRowsPerPage: 10,
  });

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        page: listState.page + 1,
        limit: listState.rowsPerPage,
        search: listState.search,
        status: statusFilter,
      };
      if (classFilter) {
        params.class_id = classFilter;
      }
      if (divisionFilter) {
        params.division_id = divisionFilter;
      }
      const { items, total } = await studentService.list(params);
      setStudents(items);
      setTotalStudents(total);
    } catch (err: any) {
      setError(err?.message || "Failed to load students");
    } finally {
      setLoading(false);
    }
  }, [listState.page, listState.rowsPerPage, listState.search, classFilter, divisionFilter, statusFilter]);

  useEffect(() => {
    if (!ready) return;
    fetchStudents();
  }, [fetchStudents, ready]);

  const openDeleteConfirm = (student: Student) => {
    setStudentToDelete(student);
    setConfirmDialogOpen(true);
  };

  const closeDeleteConfirm = () => {
    setConfirmDialogOpen(false);
    setStudentToDelete(null);
  };

  const confirmDelete = async () => {
    if (!studentToDelete) return;
    setDeleteLoading(true);
    try {
      await studentService.delete(studentToDelete.id);
      setSnackbar("Student deleted successfully");
      fetchStudents();
    } catch (err: any) {
      enqueueSnackbar(err?.message || "Failed to delete student", { variant: "error" });
    } finally {
      setDeleteLoading(false);
      closeDeleteConfirm();
    }
  };

  const closeSnackbar = () => setSnackbar(null);

  const sortedStudents = useMemo(() => {
    // Add sorting logic if needed
    return students;
  }, [students]);

  return {
    listState,
    students,
    sortedStudents,
    totalStudents,
    loading,
    error,
    snackbar,
    confirmDialogOpen,
    studentToDelete,
    deleteLoading,
    fetchStudents,
    closeSnackbar,
    openDeleteConfirm,
    closeDeleteConfirm,
    confirmDelete,
  };
}
