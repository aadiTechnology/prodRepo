import apiClient from "../client";
import { Role, RoleCreate, RoleUpdate } from "../../types/role";

const roleService = {
  getRoles: async (tenantId?: number | null): Promise<Role[]> => {
    const params = tenantId != null ? { tenant_id: tenantId } : {};
    const response = await apiClient.get<Role[]>("/roles", { params });
    return response.data;
  },

  getRoleById: async (id: number): Promise<Role> => {
    const response = await apiClient.get<Role>(`/roles/${id}`);
    return response.data;
  },

  createRole: async (data: RoleCreate): Promise<Role> => {
    const response = await apiClient.post<Role>("/roles", data);
    return response.data;
  },

  updateRole: async (id: number, data: RoleUpdate): Promise<Role> => {
    const response = await apiClient.put<Role>(`/roles/${id}`, data);
    return response.data;
  },

  deleteRole: async (id: number): Promise<void> => {
    await apiClient.delete(`/roles/${id}`);
  },
};

export default roleService;
