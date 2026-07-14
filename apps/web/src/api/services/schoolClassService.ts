/**
 * School Class Service - API client for school class management
 * Provides methods to fetch, create, update, and delete school classes
 * Supports searching and filtering by academic year
 */

import axios from "axios";
import apiClient from "../client";

// ═══════════════════════════════════════════════════════════════════════════
// Type Definitions
// ═══════════════════════════════════════════════════════════════════════════
export interface ClassDivision {
  id: number;
  class_id: number;
  division_name: string;
  capacity?: number | null;
  is_active: boolean;
  student_count?: number;
}

export interface SchoolClass {
  id: number;
  tenant_id: number;
  academic_year_id?: number | null;
  academic_year_name?: string | null;
  name: string;
  code: string;
  description?: string | null;
  capacity?: number | null;
  is_active: boolean;
  divisions: ClassDivision[];
  created_at?: string;
  created_by?: number | null;
  updated_at?: string | null;
  updated_by?: number | null;
  is_deleted?: boolean;
  deleted_at?: string | null;
  deleted_by?: number | null;
}

export type SchoolClassDivisionInput = {
  division_name: string;
  capacity?: number;
  is_active?: boolean;
};

export interface SchoolClassCreate {
  name: string;
  academic_year_id: number;
  section?: string;
  code?: string;
  description?: string;
  capacity?: number;
  is_active: boolean;
  divisions?: SchoolClassDivisionInput[];
}

export interface SchoolClassUpdate extends Partial<Omit<SchoolClassCreate, 'divisions'>> {
  divisions?: {
    id?: number;
    division_name: string;
    capacity?: number;
    is_active: boolean;
  }[];
}

const BASE_URL = "/api/classes";

// ═══════════════════════════════════════════════════════════════════════════
// School Class Service - CRUD operations
// ═══════════════════════════════════════════════════════════════════════════
const schoolClassService = {
  getAll: async (params?: {
    search?: string;
    academic_year_id?: number;
    /** Default true on API. Pass false only for Class admin (show inactive). */
    active_only?: boolean;
  }): Promise<SchoolClass[]> => {
    const response = await apiClient.get(BASE_URL, { params });
    return response.data;
  },

  getById: async (id: number): Promise<SchoolClass> => {
    const response = await apiClient.get(`${BASE_URL}/${id}`);
    return response.data;
  },

  create: async (data: SchoolClassCreate): Promise<SchoolClass> => {
    try {
      const response = await apiClient.post(BASE_URL, data);
      return response.data;
    } catch (err: unknown) {
      // Back-compat: older API builds expect divisions as string[] + class-level capacity
      if (
        axios.isAxiosError(err) &&
        err.response?.status === 422 &&
        data.divisions?.length
      ) {
        const legacyPayload = {
          name: data.name,
          academic_year_id: data.academic_year_id,
          is_active: data.is_active,
          section: data.section,
          code: data.code,
          description: data.description,
          capacity: data.divisions[0]?.capacity,
          divisions: data.divisions.map((d) => d.division_name),
        };
        const response = await apiClient.post(BASE_URL, legacyPayload);
        return response.data;
      }
      throw err;
    }
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
