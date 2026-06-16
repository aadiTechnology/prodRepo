import { apiClient } from "../client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HomeworkAttachment {
  id: number;
  homework_id: number;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size_kb: number | null;
  uploaded_at: string;
}

export interface HomeworkResponse {
  id: number;
  tenant_id: number;
  teacher_id: number;
  teacher_name: string | null;
  class_id: number;
  class_name: string | null;
  class_division_id: number | null;
  division_name: string | null;
  subject_id: number;
  subject_name: string | null;
  academic_year_id: number;
  academic_year_name: string | null;
  title: string;
  instructions: string | null;
  assigned_date: string;
  submission_date: string;
  status: "Draft" | "Published";
  notify_parents: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string | null;
  attachments: HomeworkAttachment[];
}

export interface HomeworkListResponse {
  data: HomeworkResponse[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface HomeworkCreatePayload {
  class_id: number;
  class_division_id?: number | null;
  subject_id: number;
  academic_year_id: number;
  title: string;
  instructions?: string | null;
  assigned_date: string; // ISO date: YYYY-MM-DD
  submission_date: string;
  notify_parents: boolean;
  status: "Draft" | "Published";
}

export interface HomeworkUpdatePayload {
  class_division_id?: number | null;
  subject_id?: number;
  title?: string;
  instructions?: string | null;
  assigned_date?: string;
  submission_date?: string;
  notify_parents?: boolean;
  status?: "Draft" | "Published";
}

export interface SubjectOption {
  id: number;
  name: string;
  code: string;
}

export interface DivisionOption {
  id: number;
  division_name: string;
}

export interface ClassOption {
  id: number;
  name: string;
}

export interface HomeworkListParams {
  skip?: number;
  limit?: number;
  search?: string;
  class_id?: number;
  class_division_id?: number;
  subject_id?: number;
  academic_year_id?: number;
  status?: "Draft" | "Published" | "Overdue";
  teacher_id?: number;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const homeworkService = {
  async list(params?: HomeworkListParams): Promise<HomeworkListResponse> {
    const response = await apiClient.get("/api/homework", { params });
    return response.data;
  },

  async getById(id: number): Promise<HomeworkResponse> {
    const response = await apiClient.get(`/api/homework/${id}`);
    return response.data;
  },

  async create(payload: HomeworkCreatePayload): Promise<HomeworkResponse> {
    const response = await apiClient.post("/api/homework", payload);
    return response.data;
  },

  async update(id: number, payload: HomeworkUpdatePayload): Promise<HomeworkResponse> {
    const response = await apiClient.put(`/api/homework/${id}`, payload);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/api/homework/${id}`);
  },

  async getSubjectsForClass(classId: number, academicYearId?: number): Promise<SubjectOption[]> {
    const response = await apiClient.get("/api/homework/subjects", {
      params: { class_id: classId, academic_year_id: academicYearId },
    });
    return response.data;
  },

  async getTeacherClasses(): Promise<ClassOption[]> {
    const response = await apiClient.get("/api/homework/teacher-classes");
    return response.data;
  },

  async getDivisionsForClass(classId: number): Promise<DivisionOption[]> {
    const response = await apiClient.get("/api/homework/divisions", {
      params: { class_id: classId },
    });
    return response.data;
  },

  async uploadAttachment(homeworkId: number, file: File): Promise<HomeworkAttachment> {
    const form = new FormData();
    form.append("file", file);
    const response = await apiClient.post(`/api/homework/${homeworkId}/attachments`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  async deleteAttachment(homeworkId: number, attachmentId: number): Promise<void> {
    await apiClient.delete(`/api/homework/${homeworkId}/attachments/${attachmentId}`);
  },
};
