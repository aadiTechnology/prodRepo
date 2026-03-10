export interface User {
  id: number;
  email: string;
  full_name: string;
}

export interface UserCreate {
  email: string;
  full_name: string;
  password: string;
  role: string;
  phone_number?: string | null;
  tenant_id?: number | null;
}

export interface UserUpdate {
  full_name?: string;
  phone_number?: string | null;
  is_active?: boolean;
  tenant_id?: number | null;
  role?: string;
}

export interface UserResponse extends User {
  tenant_id?: number | null;
  phone_number?: string | null;
  is_active: boolean;
  created_at: string;
  roles?: string[] | null;
}

export interface ApiError {
  detail?: string;
  [key: string]: any;
}
