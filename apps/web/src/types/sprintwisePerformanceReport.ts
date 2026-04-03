export interface SprintwiseSprintTotals {
  sprint_id: number;
  sprint_label: string;
  billable_efforts: number;
  page_efforts: number;
  /** All logged hours in the sprint (no category filter) */
  total_efforts: number;
}

export interface SprintwiseReportSlice {
  slice_key: string;
  label: string;
  owner_id: number | null;
  sprints: SprintwiseSprintTotals[];
}

export interface SprintwisePerformanceReportResponse {
  slices: SprintwiseReportSlice[];
}

export interface SprintwiseMetricRow {
  id: "billable" | "page" | "total";
  label: string;
  /** Values aligned with `sprints` column order */
  values: number[];
}
