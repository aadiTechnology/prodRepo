/**
 * Role types matching backend schemas (RoleResponse, RoleCreate, RoleUpdate)
 */

export interface Role {
  id: number;
  tenant_id: number | null;
  code: string;
  name: string;
  description: string | null;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
}

export interface RoleCreate {
  code: string;
  name: string;
  description?: string | null;
  is_system?: boolean;
  is_active?: boolean;
  tenant_id?: number | null;
}

export interface RoleUpdate {
  name?: string;
  description?: string | null;
  is_active?: boolean;
}
