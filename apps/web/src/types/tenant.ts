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
    theme_template_id?: number | null;
    // Address
    address_line1?: string | null;
    address_line2?: string | null;
    city?: string | null;
    state?: string | null;
    pin_code?: string | null;
    /** Hostname for URL-based login (e.g. tenant1.myapp.com) */
    login_url?: string | null;
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
    theme_template_id?: number | null;
    // Address
    address_line1?: string | null;
    address_line2?: string | null;
    city?: string | null;
    state?: string | null;
    pin_code?: string | null;
    login_url?: string | null;
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
    theme_template_id?: number | null;
    // Address
    address_line1?: string | null;
    address_line2?: string | null;
    city?: string | null;
    state?: string | null;
    pin_code?: string | null;
    login_url?: string | null;
}

export interface TenantProvisionResponse {
    tenant_id: number;
    admin_user_id: number;
    admin_role_id: number;
    message: string;
}

/** Public school row from GET /tenants/tenants/ (pre-login picker). */
export interface TenantSchoolPickerItem {
    id: number;
    code: string;
    name: string;
    logo_url?: string | null;
    theme_template_id?: number | null;
    theme_config?: Record<string, unknown> | null;
}

export interface TenantSchoolPickerListResponse {
    items: TenantSchoolPickerItem[];
    total: number;
}
