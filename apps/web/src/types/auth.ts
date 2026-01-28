/**
 * Authentication Types
 */

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: "user" | "admin";
  tenant_id?: number | null;
  phone_number?: string | null;
  is_active?: boolean;
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
