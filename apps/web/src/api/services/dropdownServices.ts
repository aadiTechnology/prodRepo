import { apiClient } from "../client";

export const classService = {
  async list() {
    const response = await apiClient.get("/api/classes");
    return response.data;
  },
};

export const academicYearService = {
  async list() {
    const response = await apiClient.get("/api/academic-years");
    return response.data;
  },
};

export const feeStructureService = {
  async list() {
    const response = await apiClient.get("/api/fee-structures");
    return response.data;
  },
};
