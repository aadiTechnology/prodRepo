import apiClient from "../client";
import academicYearService from "./academicYearService";

export type FeeDueStatusFilter = "ALL" | "DUE" | "OVERDUE";

export interface FeeDueListItem {
  student_id: number;
  student_name: string;
  class_name: string | null;
  installment: string;
  invoice_row_id: number | null;
  invoice_id: string | null;
  due_amount: number;
  due_date: string;
  days_overdue: number;
  status: "DUE" | "OVERDUE";
}

export interface FeeDueListSummary {
  total_due: number;
  overdue_students: number;
}

export interface FeeDueListResponse {
  summary: FeeDueListSummary;
  data: FeeDueListItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface FeeDueListQueryParams {
  academic_year_id: number;
  class_id?: number;
  installment?: string;
  search?: string;
  status?: FeeDueStatusFilter;
  page?: number;
  page_size?: number;
}

export interface AcademicYearOption {
  id: number;
  name: string;
}

export interface ClassOption {
  id: number;
  name: string;
}

const feesApi = {
  getDueListV2: async (params: FeeDueListQueryParams): Promise<FeeDueListResponse> => {
    const response = await apiClient.get<FeeDueListResponse>("/fees/due-list-v2", { params });
    return response.data;
  },

  getAcademicYears: (): Promise<AcademicYearOption[]> => academicYearService.listActive(),

  getClasses: async (academicYearId?: number): Promise<ClassOption[]> => {
    const response = await apiClient.get<ClassOption[]>("/academic/classes", {
      params: { academic_year_id: academicYearId },
    });
    return response.data ?? [];
  },
};

export default feesApi;
