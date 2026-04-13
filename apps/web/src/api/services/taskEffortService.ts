import { apiClient } from "../client";
import type {
  EffortMutationResponse,
  LastEffortDefaultsResponse,
  TaskEffortListResponse,
  TaskStatusItem,
} from "../../types/taskEffort";

export const taskEffortService = {
  listStatuses: async (): Promise<TaskStatusItem[]> => {
    const res = await apiClient.get<TaskStatusItem[]>("/task-effort/statuses");
    return res.data;
  },

  getActiveSprintId: async (projectId: number): Promise<number | null> => {
    const res = await apiClient.get<{ sprint_id: number | null }>("/task-effort/active-sprint", {
      params: { project_id: projectId },
    });
    return res.data.sprint_id ?? null;
  },

  getLastEntryDefaults: async (): Promise<LastEffortDefaultsResponse> => {
    const res = await apiClient.get<LastEffortDefaultsResponse>("/task-effort/last-entry-defaults");
    return res.data;
  },

  listTasks: async (params: {
    project_id: number;
    sprint_id: number;
    feature_id: number;
    page_id: number;
  }): Promise<TaskEffortListResponse> => {
    const res = await apiClient.get<TaskEffortListResponse>("/task-effort/tasks", { params });
    return res.data;
  },

  saveEffort: async (body: {
    project_id: number;
    timesheet_id: number;
    working_date: string;
    effort_hours: string | number;
  }): Promise<EffortMutationResponse> => {
    const res = await apiClient.post<EffortMutationResponse>("/task-effort/save-effort", body);
    return res.data;
  },

  closeTask: async (body: {
    project_id: number;
    timesheet_id: number;
    working_date: string;
  }): Promise<EffortMutationResponse> => {
    const res = await apiClient.post<EffortMutationResponse>("/task-effort/close", body);
    return res.data;
  },
};

export default taskEffortService;
