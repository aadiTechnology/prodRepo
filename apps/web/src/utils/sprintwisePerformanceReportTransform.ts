import type { SprintwiseMetricKey, SprintwiseMetricRow, SprintwiseSprintTotals } from "../types/sprintwisePerformanceReport";

function safeNum(n: number | undefined): number {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

/** Summary pivot: billable, productive (page dev), and uncategorized total per sprint. */
export function buildFullPivotRows(sprints: SprintwiseSprintTotals[]): SprintwiseMetricRow[] {
  if (!sprints.length) {
    return [
      { id: "billable", label: "Billable Efforts", values: [] },
      { id: "page", label: "Productive Efforts", values: [] },
      { id: "total", label: "Total efforts", values: [] },
    ];
  }
  return [
    { id: "billable", label: "Billable Efforts", values: sprints.map((s) => s.billable_efforts) },
    { id: "page", label: "Productive Efforts", values: sprints.map((s) => s.page_efforts) },
    { id: "total", label: "Total efforts", values: sprints.map((s) => s.total_efforts) },
  ];
}

export function buildPivotRowsForMetric(
  sprints: SprintwiseSprintTotals[],
  metric: SprintwiseMetricKey
): SprintwiseMetricRow[] {
  if (!sprints.length) {
    if (metric === "total") return [{ id: "total", label: "Total efforts", values: [] }];
    if (metric === "productive") {
      return [
        { id: "page", label: "Productive Efforts", values: [] },
        { id: "total", label: "Total efforts", values: [] },
      ];
    }
    return [
      { id: "billable", label: "Billable Efforts", values: [] },
      { id: "total", label: "Total efforts", values: [] },
    ];
  }
  if (metric === "billable") {
    return [
      { id: "billable", label: "Billable Efforts", values: sprints.map((s) => s.billable_efforts) },
      { id: "total", label: "Total efforts", values: sprints.map((s) => s.total_efforts) },
    ];
  }
  if (metric === "productive") {
    return [
      { id: "page", label: "Productive Efforts", values: sprints.map((s) => s.page_efforts) },
      { id: "total", label: "Total efforts", values: sprints.map((s) => s.total_efforts) },
    ];
  }
  return [{ id: "total", label: "Total efforts", values: sprints.map((s) => s.total_efforts) }];
}

export function memberMetricValue(m: import("../types/sprintwisePerformanceReport").MemberSprintMetrics, key: SprintwiseMetricKey): number {
  if (key === "billable") return safeNum(m.billable_efforts);
  if (key === "productive") return safeNum(m.productive_efforts);
  return safeNum(m.total_efforts);
}

export function metricColumnLabel(key: SprintwiseMetricKey): string {
  if (key === "billable") return "Billable Efforts";
  if (key === "productive") return "Productive Efforts";
  return "Total efforts";
}
