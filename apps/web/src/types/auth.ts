/**
 * Authentication Types
 */

/** Token overrides from Theme Template (partial Tokens). Used for dynamic theme generation. */
export type ThemeConfigTokenOverrides = Record<string, unknown>;

export interface TenantInfo {
  id: number;
  name: string;
  code: string;
  logo_url?: string | null;
  /** When set, theme_config contains the template's token overrides. */
  theme_template_id?: number | null;
  theme_config?: ThemeConfigTokenOverrides | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  pin_code?: string | null;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  tenant_id?: number | null;
  phone_number?: string | null;
  is_active?: boolean;
  created_at?: string;
  tenant?: TenantInfo | null;
  profile_image_path?: string | null;
  is_impersonation?: boolean;
  original_user_id?: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
