import axiosInstance from "../client";

export interface AttendanceRecord {
  student_id: number;
  status: string;
  remarks?: string;
}

export interface MarkAttendanceRequest {
  tenant_id: number;
  academic_year_id: number;
  class_id: number;
  class_division_id: number;
  attendance_date: string; // YYYY-MM-DD
  records: AttendanceRecord[];
}

export interface AttendanceResponse {
  student_id: number;
  student_name: string;
  roll_no: string | null;
  status: string | null;
  remarks: string | null;
}

export interface AttendanceListResponse {
  date: string;
  class_id: number;
  class_division_id: number;
  attendance: AttendanceResponse[];
}

const attendanceService = {
  async getAttendance(params: { attendance_date: string; class_id: number; division_id: number }) {
    const { data } = await axiosInstance.get<AttendanceListResponse>("/attendance", { params });
    return data;
  },

  async markAttendance(payload: MarkAttendanceRequest) {
    const { data } = await axiosInstance.post("/attendance/mark", payload);
    return data;
  },
};

export default attendanceService;
