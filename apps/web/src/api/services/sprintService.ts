import { apiClient } from "../client";
import type { Sprint, SprintCreate, SprintUpdate } from "../../types/sprint";

export const sprintService = {
  list: async (projectId: number, params?: { page?: number; page_size?: number; search?: string }) => {
    const res = await apiClient.get<{ items: Sprint[]; total: number }>("/sprints/", {
      params: { project_id: projectId, ...params },
    });
    return res.data;
  },

  get: async (projectId: number, sprintId: number): Promise<Sprint> => {
    const res = await apiClient.get<Sprint>(`/sprints/${sprintId}`, {
      params: { project_id: projectId },
    });
    return res.data;
  },

  create: async (projectId: number, data: SprintCreate): Promise<Sprint> => {
    const res = await apiClient.post<Sprint>("/sprints/", data, {
      params: { project_id: projectId },
    });
    return res.data;
  },

  update: async (projectId: number, sprintId: number, data: SprintUpdate): Promise<Sprint> => {
    const res = await apiClient.put<Sprint>(`/sprints/${sprintId}`, data, {
      params: { project_id: projectId },
    });
    return res.data;
  },

  delete: async (projectId: number, sprintId: number): Promise<void> => {
    await apiClient.delete(`/sprints/${sprintId}`, { params: { project_id: projectId } });
  },
};

export default sprintService;

