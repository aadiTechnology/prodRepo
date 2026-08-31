import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_LIST_ROWS_PER_PAGE } from "../utils/listPagination";
import type { NavigateFunction } from "react-router-dom";
import { useListManager } from "./useListManager";
import reportProjectService, { type ReportProjectOption } from "../api/services/reportProjectService";
import sprintService from "../api/services/sprintService";
import { useReportProjectSelection } from "./useReportProjectSelection";
import type { Sprint } from "../types/sprint";

export type SprintListSortBy = "sprint_id" | "sprint_name";

type UseSprintListControllerOptions = {
  navigate: NavigateFunction;
};

export function useSprintListController({ navigate }: UseSprintListControllerOptions) {
  const { projectId, setProjectId } = useReportProjectSelection();

  const [projects, setProjects] = useState<ReportProjectOption[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);

  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [sprintToDelete, setSprintToDelete] = useState<Sprint | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const listState = useListManager<Record<string, string>, SprintListSortBy>({
    initialFilters: {},
    initialSortBy: "sprint_id",
    initialSortOrder: "asc",
    initialRowsPerPage: DEFAULT_LIST_ROWS_PER_PAGE,
    initialPage: 0,
    initialSearch: "",
  });

  const fetchProjects = useCallback(async () => {
    try {
      setProjectsLoading(true);
      const items = await reportProjectService.listProjects();
      setProjects(items);
      if (projectId == null && items.length === 1) setProjectId(items[0].id);
    } catch {
      setProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  }, [projectId, setProjectId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const fetchSprints = useCallback(async (opts?: { silent?: boolean }) => {
    if (projectId == null) {
      setSprints([]);
      setTotal(0);
      return;
    }
    const silent = Boolean(opts?.silent);
    try {
      if (!silent) setLoading(true);
      setError(null);
      const data = await sprintService.list(projectId, {
        search: listState.search || undefined,
        page: listState.page + 1,
        page_size: listState.rowsPerPage,
      });
      setSprints(data.items);
      setTotal(data.total);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || "Failed to fetch sprints.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [listState.page, listState.rowsPerPage, listState.search, projectId]);

  useEffect(() => {
    const t = setTimeout(() => void fetchSprints(), 400);
    return () => clearTimeout(t);
  }, [fetchSprints]);

  useEffect(() => {
    if (!snackbar) return;
    const t = setTimeout(() => setSnackbar(null), 3000);
    return () => clearTimeout(t);
  }, [snackbar]);

  const openDeleteConfirm = useCallback((row: Sprint) => {
    setSprintToDelete(row);
    setConfirmDialogOpen(true);
  }, []);

  const closeDeleteConfirm = useCallback(() => setConfirmDialogOpen(false), []);

  const confirmDelete = useCallback(async () => {
    if (projectId == null || !sprintToDelete) return;
    try {
      setDeleteLoading(true);
      await sprintService.delete(projectId, sprintToDelete.sprint_id);
      setConfirmDialogOpen(false);
      setSprintToDelete(null);
      setSnackbar("Sprint deleted successfully");
      await fetchSprints();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || "Failed to delete sprint.");
    } finally {
      setDeleteLoading(false);
    }
  }, [fetchSprints, projectId, sprintToDelete]);

  const sortedSprints = useMemo(() => {
    const copy = [...sprints];
    return copy.sort((a, b) => {
      const dir = listState.sortOrder === "asc" ? 1 : -1;
      if (listState.sortBy === "sprint_name") {
        const av = (a.sprint_name || "").toLowerCase();
        const bv = (b.sprint_name || "").toLowerCase();
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
        return 0;
      }
      const av = a.sprint_id ?? 0;
      const bv = b.sprint_id ?? 0;
      return av === bv ? 0 : av < bv ? -1 * dir : 1 * dir;
    });
  }, [listState.sortBy, listState.sortOrder, sprints]);

  const onAdd = useCallback(() => {
    if (projects.length === 0) {
      setError("No projects are available for your account.");
      return;
    }
    navigate("/sprints/add");
  }, [navigate, projects.length]);

  return {
    projectId,
    setProjectId,
    projects,
    projectsLoading,
    listState,
    sprints: sortedSprints,
    total,
    loading,
    error,
    snackbar,
    setError,
    closeSnackbar: () => setSnackbar(null),
    fetchSprints,
    confirmDialogOpen,
    sprintToDelete,
    deleteLoading,
    openDeleteConfirm,
    closeDeleteConfirm,
    confirmDelete,
    onAdd,
  };
}

