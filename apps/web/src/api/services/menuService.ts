import apiClient from "../client";
import { MenuItem } from "../../types/menu";

const menuService = {
  getMenus: async (tenantId?: number | null): Promise<MenuItem[]> => {
    const params = tenantId != null ? { tenant_id: tenantId } : {};
    const response = await apiClient.get<MenuItem[]>("/menus", { params });
    return response.data;
  },

  getMenuById: async (id: number): Promise<MenuItem> => {
    const response = await apiClient.get<MenuItem>(`/menus/${id}`);
    return response.data;
  },
};

export default menuService;
