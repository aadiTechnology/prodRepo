// This service handles API calls for class-fee-structure assignment
import { apiClient } from "../client";


export interface ClassFeeStructureAssignment {
  id: number;
  academicYearId: number;
  classId: number;
  feeStructureId: number;
  effectiveDate: string;
  endDate?: string;
  status: string;
  createdBy?: number;
  createdAt: string;
  updatedAt?: string;
  updatedBy?: number;
}

export interface ClassFeeStructureAssignmentCreate {
  academic_year: string;
  class_id: number;
  fee_structure_id: number;
  effective_date: string;
}

export interface ClassFeeStructureAssignmentUpdate {
  class_id?: number;
  fee_structure_id?: number;
  effective_date?: string;
}


export const classFeeStructureAssignmentService = {
    getById: async (id: string | number) => {
      const response = await apiClient.get(`/api/fees/assign-fee-structure/${id}`);
      return response.data;
    },
  list: async (params?: { search?: string; page?: number; limit?: number }) => {
    const response = await apiClient.get("/api/fees/assign-fee-structure", { params });
    // Backend returns { success, data, pagination }
    return {
      items: response.data.data,
      total: response.data.pagination?.total || 0,
    };
  },
  create: async (data: ClassFeeStructureAssignmentCreate) => {
    const response = await apiClient.post("/api/fees/assign-fee-structure", data);
    // Backend returns { success, message, data }
    return response.data.data;
  },
  update: async (id: number, data: ClassFeeStructureAssignmentUpdate) => {
    // Convert camelCase keys to snake_case for backend
    const payload: any = {};
    if (data.class_id !== undefined) payload.class_id = data.class_id;
    if (data.fee_structure_id !== undefined) payload.fee_structure_id = data.fee_structure_id;
    if (data.effective_date !== undefined) payload.effective_date = data.effective_date;
    const response = await apiClient.put(`/api/fees/assign-fee-structure/${id}`, payload);
    return response.data.data;
  },
  deactivate: async (id: number) => {
    const response = await apiClient.patch(`/api/fees/assign-fee-structure/${id}/deactivate`);
    return response.data.data;
  },
};

export default classFeeStructureAssignmentService;
