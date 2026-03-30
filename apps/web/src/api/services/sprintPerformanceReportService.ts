import apiClient from "../client";
import type {
  SprintPerformanceFilterOptionsResponse,
  SprintPerformanceReportResponse,
  SprintReportFilters,
} from "../../types/sprintPerformanceReport";
function buildParams(filters: SprintReportFilters): Record<string, string | number> {
  const p: Record<string, string | number> = {};
  if (filters.sprintId != null) p.sprint_id = filters.sprintId;
  if (filters.featureId != null) p.feature_id = filters.featureId;
  if (filters.ownerId != null) p.owner_id = filters.ownerId;
  if (filters.taskId != null) p.task_id = filters.taskId;
  if (filters.fromDate) p.from_date = filters.fromDate;
  if (filters.toDate) p.to_date = filters.toDate;

  return p;
}

export const sprintPerformanceReportService = {
  async fetchReport(filters: SprintReportFilters): Promise<SprintPerformanceReportResponse> {
    const response = await apiClient.get<SprintPerformanceReportResponse>("/reports/sprint-performance", {
      params: buildParams(filters),
    });
    return response.data;
  },
  async fetchOptions(): Promise<SprintPerformanceFilterOptionsResponse> {
    const response = await apiClient.get<SprintPerformanceFilterOptionsResponse>("/reports/sprint-performance/options");
    return response.data;
  },
};

export default sprintPerformanceReportService;
