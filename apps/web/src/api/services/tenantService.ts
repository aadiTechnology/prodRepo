import { apiClient } from "../client";
import { Tenant, TenantCreate, TenantProvisionRequest, TenantUpdate, TenantProvisionResponse } from "../../types/tenant";

export const tenantService = {
    /**
     * List all tenants (Super Admin only)
     */
    list: async (params?: { page?: number; pageSize?: number; search?: string }): Promise<Tenant[]> => {
        const response = await apiClient.get("/tenants/", { params });
        return response.data;
    },

    /**
     * Get a single tenant by ID
     */
    get: async (id: number): Promise<Tenant> => {
        const response = await apiClient.get(`/tenants/${id}`);
        return response.data;
    },

    /**
     * Enterprise-grade tenant provisioning (admin_password is required)
     */
    provision: async (data: TenantProvisionRequest): Promise<TenantProvisionResponse> => {
        const response = await apiClient.post("/tenants/provision", data);
        return response.data;
    },

    /**
     * Update an existing tenant
     */
    update: async (id: number, data: TenantUpdate): Promise<Tenant> => {
        const response = await apiClient.put(`/tenants/${id}`, data);
        return response.data;
    },

    /**
     * Soft delete a tenant
     */
    delete: async (id: number): Promise<void> => {
        await apiClient.delete(`/tenants/${id}`);
    },

    /**
     * Activate a tenant
     */
    activate: async (id: number): Promise<void> => {
        await apiClient.post(`/tenants/${id}/activate`);
    },

    /**
     * Deactivate a tenant
     */
    deactivate: async (id: number): Promise<void> => {
        await apiClient.post(`/tenants/${id}/deactivate`);
    }
};

export default tenantService;
