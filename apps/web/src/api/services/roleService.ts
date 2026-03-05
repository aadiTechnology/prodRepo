import axiosInstance from "../axiosInstance";
// @ts-ignore: types file missing
import { Role, RoleSummary, RoleListResponse, RoleFormValues } from "../../types/role.types";

interface GetRolesParams {
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: string;
}

const roleService = {
    async getTenants() {
      const { data } = await axiosInstance.get("/tenants");
      return data.data || data;
    },
  async getRoles(params: GetRolesParams): Promise<RoleListResponse> {
    const { data } = await axiosInstance.get("/roles", {
      params: {
        search: params.search,
        pageNumber: params.page,
        pageSize: params.pageSize,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
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

  async createRole(data: RoleFormValues) {
    const res = await axiosInstance.post("/roles", data);
    return res.data;
  },

  async updateRole(id: string, data: RoleFormValues) {
    const res = await axiosInstance.put(`/roles/${id}`, data);
    return res.data;
  },

  async getRoleById(id: string) {
    const res = await axiosInstance.get(`/roles/${id}`);
    return res.data;
  },

  async getPermissionGroups() {
    const { data } = await axiosInstance.get("/rbac/permissions/groups");
    return data.data || data;
  },

  async deleteRole(id: string | number): Promise<void> {
    await axiosInstance.delete(`/roles/${id}`);
  },
};

export default roleService;