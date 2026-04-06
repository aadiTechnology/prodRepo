import apiClient from "../client";
import type {
  SprintPerformanceFilterOptionsResponse,
  SprintPerformanceReportResponse,
  SprintReportFilters,
} from "../../types/sprintPerformanceReport";

function sprintReportParamsSerializer(params: Record<string, unknown>): string {
  const usp = new URLSearchParams();
  for (const [key, raw] of Object.entries(params)) {
    if (raw === undefined || raw === null || raw === "") continue;
    if (Array.isArray(raw)) {
      for (const v of raw) usp.append(key, String(v));
    } else {
      usp.append(key, String(raw));
    }
  }
  return usp.toString();
}

function buildParams(
  projectId: number,
  filters: SprintReportFilters
): Record<string, string | number | number[]> {
  const p: Record<string, string | number | number[]> = { project_id: projectId };
  if (filters.sprintId != null) p.sprint_id = filters.sprintId;
  if (filters.featureId != null) p.feature_id = filters.featureId;
  if (filters.ownerId != null) p.owner_id = filters.ownerId;
  if (filters.taskId != null) p.task_id = filters.taskId;
  if (filters.categoryIds.length) p.category_ids = filters.categoryIds;
  if (filters.fromDate) p.from_date = filters.fromDate;
  if (filters.toDate) p.to_date = filters.toDate;

  return p;
}

export const sprintPerformanceReportService = {
  async fetchReport(projectId: number, filters: SprintReportFilters): Promise<SprintPerformanceReportResponse> {
    const response = await apiClient.get<SprintPerformanceReportResponse>("/reports/sprint-performance", {
      params: buildParams(projectId, filters),
      paramsSerializer: sprintReportParamsSerializer,
    });
    return response.data;
  },
  async fetchOptions(projectId: number): Promise<SprintPerformanceFilterOptionsResponse> {
    const response = await apiClient.get<SprintPerformanceFilterOptionsResponse>("/reports/sprint-performance/options", {
      params: { project_id: projectId },
    });
    return response.data;
  },
};

export default sprintPerformanceReportService;
