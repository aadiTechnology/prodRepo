/**
 * Unauthenticated school list for the pre-login school picker.
 * Uses the same api client (no token required for these routes).
 */

import apiClient from "../client";
import type { TenantSchoolPickerItem, TenantSchoolPickerListResponse } from "../../types/tenant";

export const publicSchoolService = {
  list: async (params: { page?: number; page_size?: number }): Promise<TenantSchoolPickerListResponse> => {
    const response = await apiClient.get<TenantSchoolPickerListResponse>("/tenants/tenants/", { params });
    return response.data;
  },

  get: async (tenantId: number): Promise<TenantSchoolPickerItem> => {
    const response = await apiClient.get<TenantSchoolPickerItem>(`/tenants/tenants/${tenantId}`);
    return response.data;
  },
};

export default publicSchoolService;
