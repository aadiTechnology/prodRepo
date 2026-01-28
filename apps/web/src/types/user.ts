export interface User {
  id: number;
  email: string;
  full_name: string;
}

export interface UserCreate {
  email: string;
  full_name: string;
  password: string;
  phone_number?: string | null;
  tenant_id?: number | null;
}

export interface UserUpdate {
  full_name: string;
}

export interface ApiError {
  detail?: string;
  [key: string]: any;
}
