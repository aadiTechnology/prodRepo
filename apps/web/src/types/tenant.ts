export interface Tenant {
    id: number;
    code: string;
    name: string;
    owner_name: string;
    email: string;
    phone?: string;
    description?: string;
    is_active: boolean;
    created_at: string;
}

export interface TenantCreate {
    name: string;
    owner_name: string;
    email: string;
    admin_password?: string;
    phone?: string;
    description?: string;
    is_active?: boolean;
}

/** Use this for the provision endpoint — admin_password is required by the backend API */
export interface TenantProvisionRequest {
    name: string;
    owner_name: string;
    email: string;
    admin_password: string;
    phone?: string;
    description?: string;
    is_active?: boolean;
}

export interface TenantUpdate {
    name?: string;
    owner_name?: string;
    phone?: string;
    description?: string;
    is_active?: boolean;
}

export interface TenantProvisionResponse {
    tenant_id: number;
    admin_user_id: number;
    admin_role_id: number;
    message: string;
}
