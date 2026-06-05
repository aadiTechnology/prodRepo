import axiosInstance from "../axiosInstance";
// @ts-ignore: types file missing
import { Role, RoleSummary, RoleListResponse, RoleFormValues } from "../../types/role.types";

interface GetRolesParams {
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: string;
  /** When true, only active roles (for assign-role dropdowns). */
  activeOnly?: boolean;
}

type RoleApiItem = {
  id: number | string;
  code: string;
  name: string;
  description?: string | null;
  scope_type?: string;
  is_system?: boolean;
  is_active?: boolean;
  is_deleted?: boolean;
  created_at?: string;
  permissions?: Role["permissions"];
};

function mapRoleApiItem(raw: RoleApiItem): Role {
  return {
    id: String(raw.id),
    code: raw.code,
    name: raw.name,
    description: raw.description ?? null,
    scope: raw.scope_type === "Platform" ? "PLATFORM" : "TENANT",
    isSystemRole: raw.is_system ?? false,
    status: raw.is_active !== false ? "ACTIVE" : "INACTIVE",
    createdAt: raw.created_at ?? "",
    permissions: raw.permissions ?? [],
  };
}

function parseRoleListResponse(data: unknown): RoleListResponse {
  const body = data as {
    data?: { items?: RoleApiItem[]; totalCount?: number; pageNumber?: number; pageSize?: number };
    items?: RoleApiItem[];
    totalCount?: number;
    pageNumber?: number;
    pageSize?: number;
  };
  const payload = body?.data ?? body;
  const rawItems = payload?.items ?? [];
  const items = rawItems.filter((r) => !r.is_deleted).map(mapRoleApiItem);
  return {
    items,
    totalCount: payload?.totalCount ?? items.length,
    pageNumber: payload?.pageNumber ?? 1,
    pageSize: payload?.pageSize ?? items.length,
  };
}

const roleService = {
    async getTenants() {
      const { data } = await axiosInstance.get("/tenants");
      return data.data || data;
    },
  async getRoles(params: GetRolesParams = {}): Promise<RoleListResponse> {
    const { data } = await axiosInstance.get("/roles", {
      params: {
        search: params.search,
        pageNumber: params.page,
        pageSize: params.pageSize,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        status: params.activeOnly ? true : undefined,
      },
    });
    return parseRoleListResponse(data);
  },

  /** Active, non-deleted roles for user create/edit role select. */
  async getSelectableRoles(): Promise<Role[]> {
    const list = await this.getRoles({ pageSize: 1000, activeOnly: true });
    return list.items;
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