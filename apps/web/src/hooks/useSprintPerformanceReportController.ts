import { useCallback, useEffect, useMemo, useState } from "react";
import reportProjectService from "../api/services/reportProjectService";
import sprintPerformanceReportService from "../api/services/sprintPerformanceReportService";
import { createSprintPerformanceReportConfig } from "../pages/reports/SprintPerformanceReport.config";
import type {
  SprintPerformanceAggregations,
  SprintPerformanceReportResponse,
  SprintReportFilters,
  SprintPerformanceFilterOptionsResponse,
  TimesheetEntryRow,
} from "../types/sprintPerformanceReport";
import type { ReportProjectOption } from "../api/services/reportProjectService";
import { useReportProjectSelection } from "./useReportProjectSelection";

const initialFilters: SprintReportFilters = {
  sprintId: null,
  featureId: null,
  ownerId: null,
  taskId: null,
  categoryIds: [],
  fromDate: "",
  toDate: "",
};

const emptyOptions: SprintPerformanceFilterOptionsResponse = {
  sprints: [],
  owners: [],
  features: [],
  categories: [],
  tasks: [],
};

export function useSprintPerformanceReportController() {
  const listConfig = useMemo(() => createSprintPerformanceReportConfig(), []);
  const { projectId, setProjectId } = useReportProjectSelection();
  const [projects, setProjects] = useState<ReportProjectOption[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [filters, setFilters] = useState<SprintReportFilters>(initialFilters);
  const [rows, setRows] = useState<TimesheetEntryRow[]>([]);
  const [aggregations, setAggregations] = useState<SprintPerformanceAggregations | null>(null);
  const [visibleColumnIds, setVisibleColumnIds] = useState<Set<string>>(() =>
    new Set(listConfig.defaultVisibleColumnIds)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [options, setOptions] = useState<SprintPerformanceFilterOptionsResponse>(emptyOptions);

  const patchFilters = useCallback((patch: Partial<SprintReportFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setProjectsLoading(true);
      try {
        const list = await reportProjectService.listProjects();
        if (!cancelled) setProjects(list);
      } catch {
        if (!cancelled) setProjects([]);
      } finally {
        if (!cancelled) setProjectsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (projectId != null || projects.length !== 1) return;
    setProjectId(projects[0].id);
  }, [projectId, projects, setProjectId]);

  useEffect(() => {
    let cancelled = false;
    if (projectId == null) {
      setOptions(emptyOptions);
      setOptionsLoading(false);
      return;
    }
    (async () => {
      setOptionsLoading(true);
      try {
        const res = await sprintPerformanceReportService.fetchOptions(projectId);
        if (!cancelled) setOptions(res);
      } catch {
        if (!cancelled) setOptions(emptyOptions);
      } finally {
        if (!cancelled) setOptionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const runReport = useCallback(async () => {
    if (projectId == null) {
      setError("Select a project to run the report.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res: SprintPerformanceReportResponse = await sprintPerformanceReportService.fetchReport(projectId, filters);
      setRows(res.rows);
      setAggregations(res.aggregations);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? listConfig.uiPolicy.errorFallbackMessage);
      setRows([]);
      setAggregations(null);
    } finally {
      setLoading(false);
    }
  }, [filters, listConfig.uiPolicy.errorFallbackMessage, projectId]);

  const visibleColumns = useMemo(() => {
    const idSet = visibleColumnIds;
    return listConfig.allColumns.filter((c) => idSet.has(c.id));
  }, [listConfig.allColumns, visibleColumnIds]);

  const columnVisibilityOptions = useMemo(
    () => listConfig.allColumns.map((c) => ({ id: c.id, label: String(c.label) })),
    [listConfig.allColumns]
  );

  return {
    listConfig,
    projectId,
    setProjectId,
    projects,
    projectsLoading,
    filters,
    patchFilters,
    runReport,
    rows,
    aggregations,
    loading,
    error,
    visibleColumnIds,
    setVisibleColumnIds,
    visibleColumns,
    columnVisibilityOptions,
    options,
    optionsLoading,
  };
}
