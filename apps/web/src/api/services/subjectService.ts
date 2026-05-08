import { apiClient } from '../client';
import { BaseResponse } from './api';

export interface SubjectClassResponse {
  class_id: number;
  class_name: string;
}

export interface SubjectResponse {
  id: number;
  tenant_id: number;
  name: string;
  code: string;
  description: string | null;
  subject_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
  classes: SubjectClassResponse[];
}

export interface SubjectListResponse {
  data: SubjectResponse[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface CreateSubjectPayload {
  name: string;
  code: string;
  description?: string;
  subject_type: string;
  is_active: boolean;
  class_ids: number[];
}

export interface UpdateSubjectPayload {
  name?: string;
  code?: string;
  description?: string;
  subject_type?: string;
  is_active?: boolean;
  class_ids?: number[];
}

export const subjectService = {
  async getSubjects(params?: {
    skip?: number;
    limit?: number;
    search?: string;
    class_id?: number;
    is_active?: boolean;
  }): Promise<SubjectListResponse> {
    const response = await apiClient.get('/api/subjects', { params });
    return response.data;
  },

  async getSubject(id: number): Promise<SubjectResponse> {
    const response = await apiClient.get(`/api/subjects/${id}`);
    return response.data;
  },

  async createSubject(data: CreateSubjectPayload): Promise<SubjectResponse> {
    const response = await apiClient.post('/api/subjects', data);
    return response.data;
  },

  async updateSubject(id: number, data: UpdateSubjectPayload): Promise<SubjectResponse> {
    const response = await apiClient.put(`/api/subjects/${id}`, data);
    return response.data;
  },

  async deleteSubject(id: number): Promise<void> {
    await apiClient.delete(`/api/subjects/${id}`);
  },
};
