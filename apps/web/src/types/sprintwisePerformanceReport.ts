export interface SprintwiseSprintTotals {
  sprint_id: number;
  sprint_label: string;
  billable_efforts: number;
  page_efforts: number;
}

export interface SprintwisePerformanceReportResponse {
  sprints: SprintwiseSprintTotals[];
}

export interface SprintwiseMetricRow {
  id: "billable" | "page";
  label: string;
  /** Values aligned with `sprints` column order */
  values: number[];
}
