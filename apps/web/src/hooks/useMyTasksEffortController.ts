import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import reportProjectService, { type ReportProjectOption } from "../api/services/reportProjectService";
import sprintService from "../api/services/sprintService";
import taskEffortService from "../api/services/taskEffortService";
import type { Sprint } from "../types/sprint";
import type { TaskEffortRow } from "../types/taskEffort";
import { useReportProjectSelection } from "./useReportProjectSelection";

function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type LastEffortDefaults = {
  projectId: number | null;
  sprintId: number | null;
  featureId: number | null;
  pageId: number | null;
};

export function useMyTasksEffortController() {
  const { projectId, setProjectId } = useReportProjectSelection();

  const [projects, setProjects] = useState<ReportProjectOption[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [lastDefaultsLoading, setLastDefaultsLoading] = useState(true);

  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [sprintsLoading, setSprintsLoading] = useState(false);
  const [selectedSprintId, setSelectedSprintId] = useState<number | null>(null);

  const [featureId, setFeatureId] = useState<number | null>(null);
  const [pageId, setPageId] = useState<number | null>(null);

  const [featureOptions, setFeatureOptions] = useState<{ id: number; label: string }[]>([]);
  const [pageOptions, setPageOptions] = useState<{ id: number; label: string }[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);

  const [workingDate, setWorkingDate] = useState<string>(todayIsoDate);

  const [tasks, setTasks] = useState<TaskEffortRow[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const [effortDraft, setEffortDraft] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [closingId, setClosingId] = useState<number | null>(null);
  const userInteractedRef = useRef(false);
  const lastDefaultsRef = useRef<LastEffortDefaults | null>(null);
  const initialProjectResolvedRef = useRef(false);

  const shouldApplyDependentDefaults = useCallback(
    (activeProjectId: number | null): boolean =>
      !userInteractedRef.current &&
      activeProjectId != null &&
      lastDefaultsRef.current?.projectId != null &&
      lastDefaultsRef.current.projectId === activeProjectId,
    []
  );

  const fetchProjects = useCallback(async () => {
    try {
      setProjectsLoading(true);
      const items = await reportProjectService.listProjects();
      setProjects(items);
    } catch {
      setProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLastDefaultsLoading(true);
        const defaults = await taskEffortService.getLastEntryDefaults();
        if (cancelled) return;
        lastDefaultsRef.current = {
          projectId: defaults.project_id ?? null,
          sprintId: defaults.sprint_id ?? null,
          featureId: defaults.feature_id ?? null,
          pageId: defaults.page_id ?? null,
        };
      } catch {
        if (!cancelled) lastDefaultsRef.current = null;
      } finally {
        if (!cancelled) setLastDefaultsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (initialProjectResolvedRef.current || projectsLoading || lastDefaultsLoading) return;
    initialProjectResolvedRef.current = true;

    const defaultProjectId = lastDefaultsRef.current?.projectId ?? null;
    const hasDefaultProject = defaultProjectId != null && projects.some((p) => p.id === defaultProjectId);
    if (hasDefaultProject) {
      setProjectId(defaultProjectId);
      return;
    }
    if (projectId != null) return;
    if (projects.length === 1) setProjectId(projects[0].id);
  }, [lastDefaultsLoading, projectId, projects, projectsLoading, setProjectId]);

  useEffect(() => {
    setFeatureId(null);
    setPageId(null);
    setPageOptions([]);
    setTasks([]);
    if (projectId == null) {
      setSprints([]);
      setSelectedSprintId(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setSprintsLoading(true);
        const [listRes, activeSid] = await Promise.all([
          sprintService.list(projectId, { page: 1, page_size: 500 }),
          taskEffortService.getActiveSprintId(projectId),
        ]);
        if (cancelled) return;
        setSprints(listRes.items);
        const canApplyDefaults = shouldApplyDependentDefaults(projectId);
        const defaultSprintId = canApplyDefaults ? lastDefaultsRef.current?.sprintId ?? null : null;
        const hasDefaultSprint =
          defaultSprintId != null && listRes.items.some((s) => s.sprint_id === defaultSprintId);
        const preferred =
          (hasDefaultSprint ? defaultSprintId : null) ??
          activeSid ??
          listRes.items.find((s) => s.is_active)?.sprint_id ??
          listRes.items[0]?.sprint_id ??
          null;
        setSelectedSprintId(preferred);
      } catch {
        if (!cancelled) {
          setSprints([]);
          setSelectedSprintId(null);
        }
      } finally {
        if (!cancelled) setSprintsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, shouldApplyDependentDefaults]);

  useEffect(() => {
    if (projectId == null) {
      setFeatureOptions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setOptionsLoading(true);
        const opt = await sprintService.getAssignmentOptions(projectId);
        if (cancelled) return;
        const features = (opt.features ?? []).map((f) => ({ id: f.id, label: f.label }));
        setFeatureOptions(features);
        if (shouldApplyDependentDefaults(projectId)) {
          const defaultFeatureId = lastDefaultsRef.current?.featureId ?? null;
          const hasDefaultFeature = defaultFeatureId != null && features.some((f) => f.id === defaultFeatureId);
          if (hasDefaultFeature) {
            setFeatureId(defaultFeatureId);
          } else if (lastDefaultsRef.current) {
            lastDefaultsRef.current = {
              ...lastDefaultsRef.current,
              featureId: null,
              pageId: null,
            };
          }
        }
      } catch {
        if (!cancelled) setFeatureOptions([]);
      } finally {
        if (!cancelled) setOptionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, shouldApplyDependentDefaults]);

  useEffect(() => {
    setPageId(null);
    setPageOptions([]);
    if (projectId == null || featureId == null) return;

    let cancelled = false;
    (async () => {
      try {
        setOptionsLoading(true);
        const pages = await sprintService.listFeaturePages(projectId, featureId);
        if (cancelled) return;
        const resolvedPages = pages.map((p) => ({ id: p.id, label: p.label }));
        setPageOptions(resolvedPages);
        if (resolvedPages.length === 1) {
          setPageId(resolvedPages[0].id);
        } else if (shouldApplyDependentDefaults(projectId) && lastDefaultsRef.current) {
          // Multiple/no pages should not auto-select from history; keep page explicitly user-driven.
          lastDefaultsRef.current = {
            ...lastDefaultsRef.current,
            pageId: null,
          };
        }
      } catch {
        if (!cancelled) setPageOptions([]);
      } finally {
        if (!cancelled) setOptionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [featureId, projectId, shouldApplyDependentDefaults]);

  const setProjectIdFromUser = useCallback(
    (id: number | null) => {
      userInteractedRef.current = true;
      setProjectId(id);
    },
    [setProjectId]
  );

  const setSelectedSprintIdFromUser = useCallback((id: number | null) => {
    userInteractedRef.current = true;
    setSelectedSprintId(id);
  }, []);

  const setFeatureIdFromUser = useCallback((id: number | null) => {
    userInteractedRef.current = true;
    setFeatureId(id);
  }, []);

  const setPageIdFromUser = useCallback((id: number | null) => {
    userInteractedRef.current = true;
    setPageId(id);
  }, []);

  const canLoadTasks = Boolean(
    projectId != null && selectedSprintId != null && featureId != null && pageId != null
  );

  const loadTasks = useCallback(async () => {
    if (projectId == null || selectedSprintId == null || featureId == null || pageId == null) {
      setTasks([]);
      return;
    }
    try {
      setTasksLoading(true);
      setError(null);
      const res = await taskEffortService.listTasks({
        project_id: projectId,
        sprint_id: selectedSprintId,
        feature_id: featureId,
        page_id: pageId,
      });
      setTasks(res.tasks);
      setEffortDraft({});
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message?: string }).message) : "";
      setError(msg || "Failed to load tasks.");
      setTasks([]);
    } finally {
      setTasksLoading(false);
    }
  }, [projectId, selectedSprintId, featureId, pageId]);

  useEffect(() => {
    if (!canLoadTasks) {
      setTasks([]);
      return;
    }
    void loadTasks();
  }, [canLoadTasks, loadTasks]);

  const sprintOptions = useMemo(
    () => sprints.map((s) => ({ id: s.sprint_id, label: s.sprint_name || `Sprint ${s.sprint_id}` })),
    [sprints]
  );

  const patchTaskInState = useCallback((updated: TaskEffortRow) => {
    setTasks((prev) => prev.map((t) => (t.timesheet_id === updated.timesheet_id ? { ...t, ...updated } : t)));
  }, []);

  const saveEffort = useCallback(
    async (row: TaskEffortRow): Promise<boolean> => {
      if (projectId == null || !workingDate) {
        setError("Working date is required.");
        return false;
      }
      const raw = effortDraft[row.timesheet_id]?.trim() ?? "";
      const hours = Number(raw);
      if (!Number.isFinite(hours) || hours <= 0) {
        setError("Effort must be a number greater than zero.");
        return false;
      }
      if (row.is_closed) {
        setError("Closed tasks cannot accept effort.");
        return false;
      }
      try {
        setSavingId(row.timesheet_id);
        setError(null);
        const res = await taskEffortService.saveEffort({
          project_id: projectId,
          timesheet_id: row.timesheet_id,
          working_date: workingDate,
          effort_hours: hours,
        });
        if (res.task) patchTaskInState(res.task);
        setEffortDraft((d) => ({ ...d, [row.timesheet_id]: "" }));
        setSnackbar("Effort saved.");
        return true;
      } catch (e: unknown) {
        const detail =
          e &&
          typeof e === "object" &&
          "response" in e &&
          e.response &&
          typeof e.response === "object" &&
          "data" in e.response
            ? (e.response as { data?: { detail?: string } }).data?.detail
            : undefined;
        setError(typeof detail === "string" ? detail : "Failed to save effort.");
        return false;
      } finally {
        setSavingId(null);
      }
    },
    [projectId, workingDate, effortDraft, patchTaskInState]
  );

  const closeTask = useCallback(
    async (row: TaskEffortRow): Promise<boolean> => {
      if (projectId == null || !workingDate) {
        setError("Working date is required.");
        return false;
      }
      if (row.is_closed) return false;
      try {
        setClosingId(row.timesheet_id);
        setError(null);
        const res = await taskEffortService.closeTask({
          project_id: projectId,
          timesheet_id: row.timesheet_id,
          working_date: workingDate,
        });
        if (res.task) patchTaskInState(res.task);
        setSnackbar("Task closed.");
        return true;
      } catch (e: unknown) {
        const detail =
          e &&
          typeof e === "object" &&
          "response" in e &&
          e.response &&
          typeof e.response === "object" &&
          "data" in e.response
            ? (e.response as { data?: { detail?: string } }).data?.detail
            : undefined;
        setError(typeof detail === "string" ? detail : "Failed to close task.");
        return false;
      } finally {
        setClosingId(null);
      }
    },
    [projectId, workingDate, patchTaskInState]
  );

  return {
    projectId,
    setProjectId: setProjectIdFromUser,
    projects,
    projectsLoading,
    sprintOptions,
    selectedSprintId,
    setSelectedSprintId: setSelectedSprintIdFromUser,
    sprintsLoading,
    featureOptions,
    featureId,
    setFeatureId: setFeatureIdFromUser,
    pageOptions,
    pageId,
    setPageId: setPageIdFromUser,
    optionsLoading,
    workingDate,
    setWorkingDate,
    tasks,
    tasksLoading,
    error,
    setError,
    snackbar,
    setSnackbar,
    effortDraft,
    setEffortDraft,
    savingId,
    closingId,
    saveEffort,
    closeTask,
    reloadTasks: loadTasks,
    canLoadTasks,
  };
}
