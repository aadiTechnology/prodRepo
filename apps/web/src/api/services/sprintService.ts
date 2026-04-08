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

  /**
   * When the user has exactly one accessible project, projectId may be omitted (backend assigns it).
   */
  create: async (data: SprintCreate, projectId?: number | null): Promise<Sprint> => {
    const res = await apiClient.post<Sprint>("/sprints/", data, {
      params: projectId != null ? { project_id: projectId } : {},
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

