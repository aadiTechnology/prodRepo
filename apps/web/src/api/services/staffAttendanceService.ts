import axiosInstance from "../client";

export interface StaffAttendanceMarkRequest {
  teacher_id: number;
  attendance_date: string; // YYYY-MM-DD
  check_in_time?: string | null;
  check_out_time?: string | null;
  remarks?: string | null;
  status?: string | null;
}

export interface StaffAttendanceApprovalRequest {
  approval_status: "Waiting for Approval" | "Approved" | "Rejected";
  rejection_reason?: string | null;
}

export interface StaffAttendanceResponse {
  id: number;
  tenant_id: number;
  teacher_id: number;
  attendance_date: string;
  status: string;
  check_in_time: string | null;
  check_out_time: string | null;
  remarks: string | null;
  working_hours_minutes: number | null;
  overtime_minutes: number | null;
  is_submitted: boolean;
  approval_status: string;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface StaffAttendanceListResponse {
  items: StaffAttendanceResponse[];
  total: number;
}

const staffAttendanceService = {
  list: async (params?: {
    teacher_id?: number;
    from_date?: string;
    to_date?: string;
  }): Promise<StaffAttendanceListResponse> => {
    const response = await axiosInstance.get("/api/staff-attendance", { params });
    return response.data;
  },

  mark: async (payload: StaffAttendanceMarkRequest): Promise<StaffAttendanceResponse> => {
    const response = await axiosInstance.post("/api/staff-attendance/mark", payload);
    return response.data;
  },

  updateApproval: async (
    recordId: number,
    payload: StaffAttendanceApprovalRequest
  ): Promise<StaffAttendanceResponse> => {
    const response = await axiosInstance.patch(
      `/api/staff-attendance/${recordId}/approval`,
      payload
    );
    return response.data;
  },
};

export default staffAttendanceService;
