/**
 * Authentication Types
 */

export interface TenantInfo {
  id: number;
  name: string;
  code: string;
  logo_url?: string | null;
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
  tenant?: TenantInfo | null;
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
