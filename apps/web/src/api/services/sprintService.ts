import { apiClient } from "../client";
import type {
  OptionItem,
  Sprint,
  SprintAssignmentManagementGridResponse,
  SprintAssignmentManagementFeatureGridResponse,
  SprintAssignmentOptionsResponse,
  SprintAssignmentsResponse,
  SprintAssignmentsWrite,
  SprintCreate,
  SprintUpdate,
} from "../../types/sprint";

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

  getAssignmentOptions: async (projectId: number): Promise<SprintAssignmentOptionsResponse> => {
    const res = await apiClient.get<SprintAssignmentOptionsResponse>("/sprints/assignment-options", {
      params: { project_id: projectId },
    });
    return res.data;
  },

  listFeaturePages: async (projectId: number, featureId: number): Promise<OptionItem[]> => {
    const res = await apiClient.get<OptionItem[]>("/sprints/assignment-pages", {
      params: { project_id: projectId, feature_id: featureId },
    });
    return res.data;
  },

  getAssignments: async (projectId: number, sprintId: number): Promise<SprintAssignmentsResponse> => {
    const res = await apiClient.get<SprintAssignmentsResponse>(`/sprints/${sprintId}/assignments`, {
      params: { project_id: projectId },
    });
    return res.data;
  },

  getAssignmentManagementGrid: async (
    projectId: number,
    sprintId: number
  ): Promise<SprintAssignmentManagementGridResponse> => {
    const res = await apiClient.get<SprintAssignmentManagementGridResponse>(
      `/sprints/${sprintId}/assignment-management/grid`,
      { params: { project_id: projectId } }
    );
    return res.data;
  },

  getAssignmentManagementFeatureGrid: async (
    projectId: number,
    sprintId: number,
    featureId: number
  ): Promise<SprintAssignmentManagementFeatureGridResponse> => {
    const res = await apiClient.get<SprintAssignmentManagementFeatureGridResponse>(
      `/sprints/${sprintId}/assignment-management/feature/${featureId}`,
      { params: { project_id: projectId } }
    );
    return res.data;
  },

  saveFeatureAssignments: async (
    projectId: number,
    sprintId: number,
    featureId: number,
    data: SprintAssignmentsWrite
  ): Promise<SprintAssignmentManagementFeatureGridResponse> => {
    const res = await apiClient.put<SprintAssignmentManagementFeatureGridResponse>(
      `/sprints/${sprintId}/assignments/feature/${featureId}`,
      data,
      { params: { project_id: projectId } }
    );
    return res.data;
  },

  saveAssignments: async (
    projectId: number,
    sprintId: number,
    data: SprintAssignmentsWrite
  ): Promise<SprintAssignmentsResponse> => {
    const res = await apiClient.put<SprintAssignmentsResponse>(`/sprints/${sprintId}/assignments`, data, {
      params: { project_id: projectId },
    });
    return res.data;
  },

  deletePageAssignments: async (
    projectId: number,
    sprintId: number,
    featureId: number,
    pageId: number
  ): Promise<void> => {
    await apiClient.delete(`/sprints/${sprintId}/assignments/page`, {
      params: { project_id: projectId, feature_id: featureId, page_id: pageId },
    });
  },
};

export default sprintService;

