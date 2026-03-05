export interface Tenant {
    id: number;
    code: string;
    name: string;
    owner_name: string;
    email: string;
    phone?: string;
    description?: string;
    is_active: boolean;
    // Branding
    logo_url?: string | null;
    // Address
    address_line1?: string | null;
    address_line2?: string | null;
    city?: string | null;
    state?: string | null;
    pin_code?: string | null;
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
    // Branding
    logo_url?: string | null;
    // Address
    address_line1?: string | null;
    address_line2?: string | null;
    city?: string | null;
    state?: string | null;
    pin_code?: string | null;
}

/** Use this for the provision endpoint — admin_password is required by the backend API */
export interface TenantProvisionRequest extends TenantCreate {
    admin_password: string;
}

export interface TenantUpdate {
    name?: string;
    owner_name?: string;
    phone?: string;
    description?: string;
    is_active?: boolean;
    // Branding
    logo_url?: string | null;
    // Address
    address_line1?: string | null;
    address_line2?: string | null;
    city?: string | null;
    state?: string | null;
    pin_code?: string | null;
}

export interface TenantProvisionResponse {
    tenant_id: number;
    admin_user_id: number;
    admin_role_id: number;
    message: string;
}
