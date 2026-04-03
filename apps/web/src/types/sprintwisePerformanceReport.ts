export interface SprintwiseSprintTotals {
  sprint_id: number;
  sprint_label: string;
  billable_efforts: number;
  page_efforts: number;
  total_efforts: number;
}

export interface SprintwiseReportSlice {
  slice_key: string;
  label: string;
  owner_id: number | null;
  sprints: SprintwiseSprintTotals[];
}

export interface MemberSprintMetrics {
  owner_id: number;
  owner_label: string;
  billable_efforts: number;
  productive_efforts: number;
  total_efforts: number;
}

export interface SprintMemberDetailBlock {
  sprint_id: number;
  sprint_label: string;
  members: MemberSprintMetrics[];
}

export interface OverallMemberSummary {
  members: MemberSprintMetrics[];
}

export interface SprintwisePerformanceReportResponse {
  slices: SprintwiseReportSlice[];
  detail_by_sprint: SprintMemberDetailBlock[];
  overall_summary: OverallMemberSummary;
}

export type SprintwiseMetricKey = "billable" | "productive" | "total";

export interface SprintwiseMetricRow {
  id: "billable" | "page" | "total";
  label: string;
  values: number[];
}
