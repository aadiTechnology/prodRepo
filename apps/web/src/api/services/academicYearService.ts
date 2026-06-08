/**
 * Academic Year Service - API client for Academic Year management
 * Provides methods to fetch, create, update, and delete academic years
 * Communicates with backend academic year endpoints
 */

import apiClient from "../client";
import { filterActiveAcademicYears } from "../../utils/academicYear";

// ═══════════════════════════════════════════════════════════════════════════
// Type Definitions
// ═══════════════════════════════════════════════════════════════════════════
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

export interface AcademicYearListOptions {
  /** When true, exclude inactive/deactivated years (use for dropdowns). */
  activeOnly?: boolean;
}

const BASE_URL = "/api/academic-years";

// ═══════════════════════════════════════════════════════════════════════════
// Academic Year Service - CRUD operations
// ═══════════════════════════════════════════════════════════════════════════
export const academicYearService = {
  getAll: async (options?: AcademicYearListOptions): Promise<AcademicYear[]> => {
    // Filter active years client-side only. Sending active_only=true breaks on some API
    // deployments (SQL Server BIT handling); client filter is sufficient for dropdowns.
    const response = await apiClient.get(BASE_URL);
    const years: AcademicYear[] = response.data ?? [];
    return options?.activeOnly ? filterActiveAcademicYears(years) : years;
  },

  /** Active academic years only — for dropdowns across the app. */
  listActive: async (): Promise<AcademicYear[]> => {
    return academicYearService.getAll({ activeOnly: true });
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
