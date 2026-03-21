import apiClient from "../client";

export interface SchoolClass {
  id: number;
  tenant_id: number;
  academic_year_id: number;
  name: string;
  code: string;
  description?: string | null;
  section?: string | null;
  capacity?: number | null;
  is_active: boolean;
  created_at?: string;
  created_by?: number | null;
  updated_at?: string | null;
  updated_by?: number | null;
  is_deleted?: boolean;
  deleted_at?: string | null;
  deleted_by?: number | null;
}

export interface SchoolClassCreate {
  academic_year_id: number;
  name: string;
  code?: string;
  description?: string;
  section?: string;
  capacity?: number;
  is_active: boolean;
}

export interface SchoolClassUpdate extends Partial<SchoolClassCreate> {}

const BASE_URL = "/api/classes";

const schoolClassService = {
  getAll: async (params?: { search?: string }): Promise<SchoolClass[]> => {
    const response = await apiClient.get(BASE_URL, { params });
    return response.data;
  },

  getById: async (id: number): Promise<SchoolClass> => {
    const response = await apiClient.get(`${BASE_URL}/${id}`);
    return response.data;
  },

  create: async (data: SchoolClassCreate): Promise<SchoolClass> => {
    const response = await apiClient.post(BASE_URL, data);
    return response.data;
  },

  update: async (id: number, data: SchoolClassUpdate): Promise<SchoolClass> => {
    const response = await apiClient.put(`${BASE_URL}/${id}`, data);
    return response.data;
  },

  softDelete: async (id: number): Promise<void> => {
    await apiClient.delete(`${BASE_URL}/${id}`);
  },
};

export default schoolClassService;
