export interface TimesheetEntryRow {
  owner_name: string | null;
  feature_name: string | null;
  page_name: string | null;
  task_type: string | null;
  subtask: string | null;
  description: string | null;
  spend_efforts: string | number | null;
  created_on: string | null;
  sprint: number | null;
}

export interface SprintPerformanceAggregations {
  total_hours: number;
  unique_page_names: number;
  entries_count: number;
  pages_per_hour: number | null;
}

export interface SprintPerformanceReportResponse {
  rows: TimesheetEntryRow[];
  aggregations: SprintPerformanceAggregations;
}

export type SprintReportFilters = {
  sprintId: number | null;
  featureId: number | null;
  ownerId: number | null;
  taskId: number | null;
  categoryIds: number[];
  fromDate: string;
  toDate: string;
};

export type ReportOption = { id: number; label: string };

export type TaskReportOption = ReportOption & { category_ids: number[] };

export interface SprintPerformanceFilterOptionsResponse {
  sprints: ReportOption[];
  owners: ReportOption[];
  features: ReportOption[];
  categories: ReportOption[];
  tasks: TaskReportOption[];
}
