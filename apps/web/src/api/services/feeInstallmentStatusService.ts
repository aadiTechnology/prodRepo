import { apiClient } from "../client";
import type {
  FeeInstallmentStatusResponse,
  StudentSearchItem,
} from "../../types/feeInstallmentStatus";

export async function fetchFeeInstallmentStatus(params: {
  student_id: number;
  academic_year_id: number;
}): Promise<FeeInstallmentStatusResponse> {
  const res = await apiClient.get<FeeInstallmentStatusResponse>(
    "/api/fees/installment-status",
    { params }
  );
  return res.data;
}

export async function searchStudents(params: {
  search?: string;
  class_id?: number;
  limit?: number;
}): Promise<StudentSearchItem[]> {
  const res = await apiClient.get<StudentSearchItem[]>(
    "/fees/installment-tracking/students",
    { params }
  );
  return res.data;
}

