import { apiClient } from "../client";
import academicYearApi from "./academicYearService";

export const classService = {
  async list() {
    const response = await apiClient.get("/api/classes");
    return response.data;
  },
};

export const academicYearService = {
  list: () => academicYearApi.listActive(),
};

export const feeStructureService = {
  async list(params: { academicYear: string | number, classId: string | number, tenantId: string | number }) {
    // The backend expects academicYear, classId, tenantId (not academicYearId)
    const { academicYear, classId, tenantId } = params;
    const response = await apiClient.get("/api/fee-structures", {
      params: { academicYear, classId, tenantId }
    });
    return response.data;
  },
};
