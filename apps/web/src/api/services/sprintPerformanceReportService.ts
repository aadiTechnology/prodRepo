import apiClient from "../client";
import type { SprintPerformanceReportResponse, SprintReportFilters } from "../../types/sprintPerformanceReport";
function buildParams(filters: SprintReportFilters): Record<string, string | number> {
  const p: Record<string, string | number> = {};
  if (filters.sprint.trim()) p.sprint_name = filters.sprint.trim();
  if (filters.team.trim()) p.team_name = filters.team.trim();
  if (filters.activityType.trim()) p.activity_type = filters.activityType.trim();
  if (filters.fromDate) p.from_date = filters.fromDate;
  if (filters.toDate) p.to_date = filters.toDate;

  if (filters.employeeId.trim()) {
    const id = Number(filters.employeeId);
    if (Number.isFinite(id)) p.employee_id = id;
  } else if (filters.ownerName.trim()) {
    p.owner_name = filters.ownerName.trim();
  }

  return p;
}

export const sprintPerformanceReportService = {
  async fetchReport(filters: SprintReportFilters): Promise<SprintPerformanceReportResponse> {
    const response = await apiClient.get<SprintPerformanceReportResponse>("/reports/sprint-performance", {
      params: buildParams(filters),
    });
    return response.data;
  },
};

export default sprintPerformanceReportService;
