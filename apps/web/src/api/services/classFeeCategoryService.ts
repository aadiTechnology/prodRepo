import { apiClient } from "../client";

export const classService = {
  list: async () => {
    const response = await apiClient.get("/academic/classes");
    return response.data;
  },
};

export const feeCategoryService = {
  list: async () => {
    const response = await apiClient.get("/fees/categories");
    return response.data;
  },
};
