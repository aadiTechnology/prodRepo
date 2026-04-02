import { useCallback, useEffect, useMemo, useState } from "react";
import sprintPerformanceReportService from "../api/services/sprintPerformanceReportService";
import { createSprintPerformanceReportConfig } from "../pages/reports/SprintPerformanceReport.config";
import type {
  SprintPerformanceAggregations,
  SprintPerformanceReportResponse,
  SprintReportFilters,
  SprintPerformanceFilterOptionsResponse,
  TimesheetEntryRow,
} from "../types/sprintPerformanceReport";

const initialFilters: SprintReportFilters = {
  sprintId: null,
  featureId: null,
  ownerId: null,
  taskId: null,
  categoryIds: [],
  fromDate: "",
  toDate: "",
};

export function useSprintPerformanceReportController() {
  const listConfig = useMemo(() => createSprintPerformanceReportConfig(), []);
  const [filters, setFilters] = useState<SprintReportFilters>(initialFilters);
  const [rows, setRows] = useState<TimesheetEntryRow[]>([]);
  const [aggregations, setAggregations] = useState<SprintPerformanceAggregations | null>(null);
  const [visibleColumnIds, setVisibleColumnIds] = useState<Set<string>>(() =>
    new Set(listConfig.defaultVisibleColumnIds)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [options, setOptions] = useState<SprintPerformanceFilterOptionsResponse>({
    sprints: [],
    owners: [],
    features: [],
    categories: [],
    tasks: [],
  });

  const patchFilters = useCallback((patch: Partial<SprintReportFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setOptionsLoading(true);
      try {
        const res = await sprintPerformanceReportService.fetchOptions();
        if (!cancelled) setOptions(res);
      } catch {
        if (!cancelled) {
          setOptions({ sprints: [], owners: [], features: [], categories: [], tasks: [] });
        }
      } finally {
        if (!cancelled) setOptionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const runReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res: SprintPerformanceReportResponse = await sprintPerformanceReportService.fetchReport(filters);
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
  }, [filters, listConfig.uiPolicy.errorFallbackMessage]);

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
