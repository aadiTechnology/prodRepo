import type { SprintwiseMetricRow, SprintwiseSprintTotals } from "../types/sprintwisePerformanceReport";

export function buildSprintwiseMetricRows(sprints: SprintwiseSprintTotals[]): SprintwiseMetricRow[] {
  if (!sprints.length) {
    return [
      { id: "billable", label: "Billable Efforts", values: [] },
      { id: "page", label: "Page Efforts", values: [] },
    ];
  }
  return [
    {
      id: "billable",
      label: "Billable Efforts",
      values: sprints.map((s) => s.billable_efforts),
    },
    {
      id: "page",
      label: "Page Efforts",
      values: sprints.map((s) => s.page_efforts),
    },
  ];
}
