import type { DataTableColumn } from "../../components/reusable";
import type { ListUiPolicy } from "../../components/reusable/listFramework.types";
import { Box, Typography } from "../../components/primitives";
import { formatHours, formatShortDate } from "../../utils/formatters";
import type { TimesheetEntryRow } from "../../types/sprintPerformanceReport";

export type ReportChartKind = "bar" | "line";

export interface SprintPerformanceChartMeta {
  id: string;
  title: string;
  kind: ReportChartKind;
  description: string;
}

export interface SprintPerformanceFilterMeta {
  id: string;
  label: string;
  queryParam: string;
}

export interface SprintPerformanceAggregationMeta {
  id: string;
  label: string;
  field: keyof import("../../types/sprintPerformanceReport").SprintPerformanceAggregations;
  description: string;
}

export interface SprintPerformanceReportConfig {
  reportId: "sprint-performance";
  allColumns: DataTableColumn<TimesheetEntryRow>[];
  defaultVisibleColumnIds: string[];
  uiPolicy: ListUiPolicy;
  filterMeta: SprintPerformanceFilterMeta[];
  chartMeta: SprintPerformanceChartMeta[];
  aggregationMeta: SprintPerformanceAggregationMeta[];
}

export function createSprintPerformanceReportConfig(): SprintPerformanceReportConfig {
  return {
    reportId: "sprint-performance",
    allColumns: [
      { id: "owner_name", label: "Owner", field: "owner_name" },
      { id: "feature_name", label: "Feature", field: "feature_name" },
      { id: "page_name", label: "Page", field: "page_name" },
      { id: "task_type", label: "Task type", field: "task_type" },
      { id: "subtask", label: "Subtask", field: "subtask" },
      {
        id: "description",
        label: "Description",
        field: "description",
        render: (r) => (
          <Typography variant="body2" sx={{ maxWidth: 280, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {r.description ?? "—"}
          </Typography>
        ),
      },
      {
        id: "spend_efforts",
        label: "Hours",
        field: "spend_efforts",
        align: "right",
        render: (r) => formatHours(r.spend_efforts),
      },
      {
        id: "created_on",
        label: "Created",
        render: (r) => formatShortDate(r.created_on),
      },
      { id: "sprint", label: "Sprint", field: "sprint", render: (r) => (r.sprint != null ? String(r.sprint) : "—") },
    ],
    defaultVisibleColumnIds: [
      "owner_name",
      "feature_name",
      "page_name",
      "task_type",
      "spend_efforts",
      "created_on",
      "sprint",
    ],
    uiPolicy: {
      emptyMessage: (
        <Box sx={{ py: 4 }}>
          <Typography variant="body2" color="text.secondary">
            No timesheet rows for these filters. Adjust filters and run the report.
          </Typography>
        </Box>
      ),
      errorFallbackMessage: "Failed to load sprint performance report.",
      retryLabel: "Retry",
    },
    filterMeta: [
      { id: "sprint", label: "Sprint", queryParam: "sprint_name" },
      { id: "team", label: "Feature / area", queryParam: "team_name" },
      { id: "employee", label: "Employee", queryParam: "employee_id" },
      { id: "owner", label: "Owner name", queryParam: "owner_name" },
      { id: "activity", label: "Activity type", queryParam: "activity_type" },
      { id: "from", label: "From date", queryParam: "from_date" },
      { id: "to", label: "To date", queryParam: "to_date" },
    ],
    chartMeta: [
      {
        id: "sprint-vs-pages",
        title: "Sprint vs distinct page names",
        kind: "bar",
        description: "Unique PageName count per sprint in the returned dataset.",
      },
      {
        id: "sprint-vs-hours",
        title: "Sprint vs hours",
        kind: "bar",
        description: "Sum of spend effort per sprint.",
      },
      {
        id: "feature-comparison",
        title: "Feature comparison",
        kind: "bar",
        description: "Hours by feature name (team proxy).",
      },
      {
        id: "individual-trend",
        title: "Individual hours by month",
        kind: "line",
        description: "Trend of logged hours for top contributors.",
      },
    ],
    aggregationMeta: [
      {
        id: "total_hours",
        label: "Total hours",
        field: "total_hours",
        description: "Sum of SpendEfforts in the dataset.",
      },
      {
        id: "unique_pages",
        label: "Distinct page names",
        field: "unique_page_names",
        description: "Count of unique non-empty PageName values (not a completion metric).",
      },
      {
        id: "entries",
        label: "Entries",
        field: "entries_count",
        description: "Number of timesheet rows returned.",
      },
      {
        id: "pph",
        label: "Pages / hour",
        field: "pages_per_hour",
        description: "Distinct page names divided by total hours.",
      },
    ],
  };
}
