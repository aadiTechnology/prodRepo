import { apiClient } from "../client";

export const classService = {
  list: async () => {
    const response = await apiClient.get("/api/classes");
    return response.data;
  },
};

export const feeCategoryService = {
  list: async () => {
    const response = await apiClient.get("/api/fee-categories");
    return response.data;
  },
};
