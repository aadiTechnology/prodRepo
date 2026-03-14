import apiClient from "../client";
import {
  FeeStructure,
  FeeStructureCreate,
  PaginatedResponse,
  FeeCategory,
  FeeCategoryCreate,
  FeeCategoryUpdate,
  AcademicYear,
  ClassEntity,
} from "../../types/fee";

const feeService = {
  getFeeStructures: async (page = 0, size = 10, search = ""): Promise<PaginatedResponse<FeeStructure>> => {
    const response = await apiClient.get("/fees/structures", {
      params: { page, size, search },
    });
    return response.data;
  },

  createFeeStructure: async (data: FeeStructureCreate): Promise<FeeStructure> => {
    const response = await apiClient.post("/fees/structures", data);
    return response.data;
  },

  updateFeeStructure: async (id: number, data: Partial<FeeStructureCreate>): Promise<FeeStructure> => {
    const response = await apiClient.put(`/fees/structures/${id}`, data);
    return response.data;
  },

  deleteFeeStructure: async (id: number): Promise<void> => {
    await apiClient.delete(`/fees/structures/${id}`);
  },

  getFeeCategories: async (): Promise<FeeCategory[]> => {
    const response = await apiClient.get("/fees/categories");
    return response.data;
  },

  getFeeCategory: async (id: string): Promise<FeeCategory> => {
    const response = await apiClient.get(`/fees/categories/${id}`);
    return response.data;
  },

  createFeeCategory: async (data: FeeCategoryCreate): Promise<FeeCategory> => {
    const response = await apiClient.post("/fees/categories", data);
    return response.data;
  },

  updateFeeCategory: async (id: string, data: FeeCategoryUpdate): Promise<FeeCategory> => {
    const response = await apiClient.put(`/fees/categories/${id}`, data);
    return response.data;
  },

  deleteFeeCategory: async (id: string): Promise<void> => {
    await apiClient.delete(`/fees/categories/${id}`);
  },

  getAcademicYears: async (): Promise<AcademicYear[]> => {
    const response = await apiClient.get("/academic/academic-years");
    return response.data;
  },

  getClasses: async (academicYearId?: number): Promise<ClassEntity[]> => {
    const response = await apiClient.get("/academic/classes", {
      params: { academic_year_id: academicYearId }
    });
    return response.data;
  }
};

export const {
  getFeeStructures,
  createFeeStructure,
  updateFeeStructure,
  deleteFeeStructure,
  getFeeCategories,
  getFeeCategory,
  createFeeCategory,
  updateFeeCategory,
  deleteFeeCategory,
  getAcademicYears,
  getClasses,
} = feeService;

export default feeService;
