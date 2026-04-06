import apiClient from "../client";

export type ReportProjectOption = { id: number; label: string };

export const reportProjectService = {
  async listProjects(): Promise<ReportProjectOption[]> {
    const res = await apiClient.get<ReportProjectOption[]>("/reports/projects");
    return res.data;
  },
};

export default reportProjectService;
