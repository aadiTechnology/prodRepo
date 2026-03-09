import { apiClient } from "../client";
import type {
  ThemeTemplate,
  ThemeTemplateCreate,
  ThemeTemplateUpdate,
  ThemeTemplateListResponse,
} from "../../types/themeTemplate";

export const themeTemplateService = {
  list: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
  }): Promise<ThemeTemplateListResponse> => {
    const response = await apiClient.get<ThemeTemplateListResponse>("/theme-templates/", {
      params,
    });
    return response.data;
  },

  get: async (id: number): Promise<ThemeTemplate> => {
    const response = await apiClient.get<ThemeTemplate>(`/theme-templates/${id}`);
    return response.data;
  },

  create: async (data: ThemeTemplateCreate): Promise<ThemeTemplate> => {
    const response = await apiClient.post<ThemeTemplate>("/theme-templates/", data);
    return response.data;
  },

  update: async (id: number, data: ThemeTemplateUpdate): Promise<ThemeTemplate> => {
    const response = await apiClient.put<ThemeTemplate>(`/theme-templates/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/theme-templates/${id}`);
  },
};

export default themeTemplateService;
