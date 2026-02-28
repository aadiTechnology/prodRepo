import apiClient from "../client";
import { MenuItem } from "../../types/menu";

const rbacService = {
  getRoleMenus: async (roleId: number): Promise<MenuItem[]> => {
    const response = await apiClient.get<MenuItem[]>(`/rbac/roles/${roleId}/menus`);
    return response.data;
  },

  setRoleMenus: async (roleId: number, menuIds: number[]): Promise<void> => {
    await apiClient.post(`/rbac/roles/${roleId}/menus`, menuIds);
  },
};

export default rbacService;
