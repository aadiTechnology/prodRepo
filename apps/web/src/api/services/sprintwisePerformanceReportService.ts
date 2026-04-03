import apiClient from "../client";
import type { SprintwisePerformanceReportResponse } from "../../types/sprintwisePerformanceReport";

function paramsSerializer(params: Record<string, unknown>): string {
  const usp = new URLSearchParams();
  for (const [key, raw] of Object.entries(params)) {
    if (raw === undefined || raw === null) continue;
    if (typeof raw === "boolean") {
      usp.append(key, raw ? "true" : "false");
      continue;
    }
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

export interface SprintwiseReportRequestParams {
  memberIds: number[] | null;
  sprintIds: number[] | null;
  includeDetail: boolean;
}

export const sprintwisePerformanceReportService = {
  async fetchReport(params: SprintwiseReportRequestParams): Promise<SprintwisePerformanceReportResponse> {
    const q: Record<string, unknown> = { include_detail: params.includeDetail };
    if (params.memberIds != null && params.memberIds.length > 0) q.member_ids = params.memberIds;
    if (params.sprintIds != null && params.sprintIds.length > 0) q.sprint_ids = params.sprintIds;
    const response = await apiClient.get<SprintwisePerformanceReportResponse>("/reports/sprintwise-performance", {
      params: q,
      paramsSerializer,
    });
    return response.data;
  },
};

export default sprintwisePerformanceReportService;
