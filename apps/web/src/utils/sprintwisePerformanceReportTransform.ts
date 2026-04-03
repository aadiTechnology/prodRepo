import type { SprintwiseMetricRow, SprintwiseSprintTotals } from "../types/sprintwisePerformanceReport";

function safeNum(n: number | undefined): number {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

export function buildSprintwiseMetricRows(sprints: SprintwiseSprintTotals[]): SprintwiseMetricRow[] {
  if (!sprints.length) {
    return [
      { id: "billable", label: "Billable Efforts", values: [] },
      { id: "page", label: "Page Efforts", values: [] },
      { id: "total", label: "Total efforts", values: [] },
    ];
  }
  const billable = sprints.map((s) => s.billable_efforts);
  const page = sprints.map((s) => s.page_efforts);
  const total = sprints.map((s) => safeNum(s.total_efforts));
  return [
    { id: "billable", label: "Billable Efforts", values: billable },
    { id: "page", label: "Page Efforts", values: page },
    { id: "total", label: "Total efforts", values: total },
  ];
}
