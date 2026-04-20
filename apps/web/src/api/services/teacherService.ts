import axiosInstance from "../client";

export interface TeacherDropdownItem {
  id: number;
  full_name: string;
  teacher_code: string;
}

export interface TeacherBase {
  full_name: string;
  date_of_birth?: string | null;
  gender?: string | null;
  mobile_number: string;
  email?: string | null;
  qualification?: string | null;
  experience_years?: number | null;
  photo_url?: string | null;
  class_id?: number | null;
  class_division_id?: number | null;
  is_active: boolean;
}

export interface TeacherCreate extends TeacherBase {}

export interface TeacherUpdate extends Partial<TeacherBase> {}

export interface TeacherResponse extends TeacherBase {
  id: number;
  tenant_id: number;
  teacher_code?: string;
  created_at: string;
  updated_at?: string | null;
  class_name?: string | null;
  division_name?: string | null;
}

export interface TeacherListResponse {
  items: TeacherResponse[];
  total: number;
}

const teacherService = {
  create: async (data: TeacherCreate): Promise<TeacherResponse> => {
    const response = await axiosInstance.post("/api/teachers/", data);
    return response.data;
  },

  update: async (id: number, data: TeacherUpdate): Promise<TeacherResponse> => {
    const response = await axiosInstance.put(`/api/teachers/${id}`, data);
    return response.data;
  },

  list: async (params?: { skip?: number; limit?: number; search?: string; class_id?: number; class_division_id?: number; status?: string }): Promise<TeacherListResponse> => {
    const response = await axiosInstance.get("/api/teachers/", { params });
    return response.data;
  },

  getById: async (id: number): Promise<TeacherResponse> => {
    const response = await axiosInstance.get(`/api/teachers/${id}`);
    return response.data;
  },

  toggleStatus: async (id: number): Promise<TeacherResponse> => {
    const response = await axiosInstance.patch(`/api/teachers/${id}/status`);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/api/teachers/${id}`);
  },
};

export default teacherService;
