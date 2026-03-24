import apiClient from "../client";

export interface AcademicYear {
  id: number;
  name: string;
  code: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

export interface AcademicYearCreate {
  name: string;
  code: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export interface AcademicYearUpdate extends Partial<AcademicYearCreate> {}

const BASE_URL = "/academic/academic-years";

export const academicYearService = {
  getAll: async (): Promise<AcademicYear[]> => {
    const response = await apiClient.get(BASE_URL);
    return response.data;
  },

  getById: async (id: number): Promise<AcademicYear> => {
    const response = await apiClient.get(`${BASE_URL}/${id}`);
    return response.data;
  },

  create: async (data: AcademicYearCreate): Promise<AcademicYear> => {
    const response = await apiClient.post(BASE_URL, data);
    return response.data;
  },

  update: async (id: number, data: AcademicYearUpdate): Promise<AcademicYear> => {
    const response = await apiClient.put(`${BASE_URL}/${id}`, data);
    return response.data;
  },

  softDelete: async (id: number): Promise<void> => {
    await apiClient.delete(`${BASE_URL}/${id}`);
  },
};

export default academicYearService;
