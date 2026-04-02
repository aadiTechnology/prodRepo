import apiClient from "../client";
import type { SprintwisePerformanceReportResponse } from "../../types/sprintwisePerformanceReport";

function paramsSerializer(params: Record<string, unknown>): string {
  const usp = new URLSearchParams();
  for (const [key, raw] of Object.entries(params)) {
    if (raw === undefined || raw === null) continue;
    if (Array.isArray(raw)) {
      for (const v of raw) {
        if (v !== undefined && v !== null) usp.append(key, String(v));
      }
    } else {
      usp.append(key, String(raw));
    }
  }
  return usp.toString();
}

export const sprintwisePerformanceReportService = {
  async fetchReport(memberIds: number[] | null): Promise<SprintwisePerformanceReportResponse> {
    const params: Record<string, unknown> = {};
    if (memberIds != null && memberIds.length > 0) {
      params.member_ids = memberIds;
    }
    const response = await apiClient.get<SprintwisePerformanceReportResponse>("/reports/sprintwise-performance", {
      params,
      paramsSerializer,
    });
    return response.data;
  },
};

export default sprintwisePerformanceReportService;
