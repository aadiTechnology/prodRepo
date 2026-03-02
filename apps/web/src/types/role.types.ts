export interface Permission {
  id: string;
  name: string;
  code: string;
  module_name: string;
}


export interface Role {
  id: string;
  name: string;
  description: string | null;
  scope: "PLATFORM" | "TENANT";
  isSystemRole: boolean;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  permissions: Permission[];
}


export interface RoleSummary {
  totalRoles: number;
  platformRoles: number;
  tenantRoles: number;
  activeRoles?: number;
  inactiveRoles?: number;
}

// Matches backend API response for role list
export interface RoleListResponse {
  items: Role[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
  };
}