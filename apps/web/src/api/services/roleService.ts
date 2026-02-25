import axiosInstance from "../axiosInstance";
import { Role, RoleSummary, PaginatedResponse } from "../types/role.types";

interface GetRolesParams {
  search?: string;
  page?: number;
  pageSize?: number;
}

const roleService = {
  async getRoles(params: GetRolesParams): Promise<PaginatedResponse<Role>> {
    const { data } = await axiosInstance.get("/roles", {
      params: {
        search: params.search,
        pageNumber: params.page,
        pageSize: params.pageSize,
      },
    });
    return data.data;
  },

  async getRoleSummary(): Promise<RoleSummary> {
    const { data } = await axiosInstance.get("/roles/summary");
    return data.data;
  },

  async deactivateRole(id: string): Promise<void> {
    await axiosInstance.put(`/roles/${id}/deactivate`);
  },
};

export default roleService;