/**
 * Menu Service
 * Handles API calls for Menu (Module / Page) CRUD operations.
 * Menus represent the 2-level navigation hierarchy:
 *   level 1 = Module (top-level navigation group)
 *   level 2 = Page   (child screen inside a module)
 */

import apiClient from "../client";

export interface MenuRecord {
  id: number;
  name: string;
  path: string | null;
  icon: string | null;
  sort_order: number;
  level: 1 | 2;
  parent_id: number | null;
  tenant_id: number | null;
  is_active: boolean;
  feature_id: number | null;
  feature_code: string | null;
  feature_name: string | null;
  created_at: string;
}

export interface MenuCreatePayload {
  name: string;
  path?: string | null;
  icon?: string | null;
  sort_order: number;
  level: number;
  parent_id?: number | null;
  tenant_id?: number | null;
  is_active: boolean;
  feature_id?: number | null;
}

export interface MenuUpdatePayload {
  name?: string;
  path?: string | null;
  icon?: string | null;
  sort_order?: number;
  is_active?: boolean;
  feature_id?: number | null;
  parent_id?: number | null;
}

class MenuService {
  async getMenus(tenantId?: number): Promise<MenuRecord[]> {
    const params: Record<string, unknown> = {};
    if (tenantId !== undefined) params.tenant_id = tenantId;
    const response = await apiClient.get("/menus/", { params });
    return Array.isArray(response.data) ? response.data : [];
  }

  async getMenuById(menuId: number): Promise<MenuRecord> {
    const response = await apiClient.get(`/menus/${menuId}`);
    return response.data;
  }

  async createMenu(data: MenuCreatePayload): Promise<MenuRecord> {
    const response = await apiClient.post("/menus/", data);
    return response.data;
  }

  async updateMenu(menuId: number, data: MenuUpdatePayload): Promise<MenuRecord> {
    const response = await apiClient.put(`/menus/${menuId}`, data);
    return response.data;
  }

  async deleteMenu(menuId: number): Promise<void> {
    await apiClient.delete(`/menus/${menuId}`);
  }

  /** Returns only level-1 menus (Modules). Used for parent selector in Page forms. */
  async getModules(tenantId?: number): Promise<MenuRecord[]> {
    const all = await this.getMenus(tenantId);
    return all.filter((m) => m.level === 1 && m.is_active);
  }
}

export default new MenuService();
