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

export interface AttendanceReportItem {
  date: string;
  roll_no: string | null;
  student_name: string;
  status: string;
  type: string | null; // HD, L
  remarks: string | null;
}

export interface AttendanceReportSummary {
  total_present: number;
  total_absent: number;
  total_half_day: number;
  total_leave: number;
}

export interface AttendanceReportResponse {
  records: AttendanceReportItem[];
  summary: AttendanceReportSummary;
  total_count: number;
}

export interface AttendanceScopeDivision {
  id: number;
  division_name: string;
}

export interface AttendanceScopeClass {
  id: number;
  name: string;
  academic_year_id?: number | null;
  divisions: AttendanceScopeDivision[];
}

export interface AttendanceTeacherScopeResponse {
  teacher_id: number;
  teacher_name: string;
  classes: AttendanceScopeClass[];
}

const attendanceService = {
  async getMyScope(academicYearId?: number) {
    const params = academicYearId ? { academic_year_id: academicYearId } : undefined;
    try {
      const { data } = await axiosInstance.get<AttendanceTeacherScopeResponse>(
        "/attendance/my-scope",
        { params }
      );
      return data;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status !== 404) throw err;
      const { data } = await axiosInstance.get<AttendanceTeacherScopeResponse>(
        "/api/teachers/me/attendance-scope",
        { params }
      );
      return data;
    }
  },

  async getAttendance(params: {
    attendance_date: string;
    class_id: number;
    division_id: number;
    academic_year_id?: number;
  }) {
    const { data } = await axiosInstance.get<AttendanceListResponse>("/attendance", { params });
    return data;
  },

  async markAttendance(payload: MarkAttendanceRequest) {
    const { data } = await axiosInstance.post("/attendance/mark", payload);
    return data;
  },

  async getReport(params: {
    from_date: string;
    to_date: string;
    class_id?: number;
    division_id?: number;
    student_id?: number;
    academic_year_id?: number;
    limit?: number;
    offset?: number;
  }) {
    const { data } = await axiosInstance.get<AttendanceReportResponse>("/attendance/report", { params });
    return data;
  },
};

export default attendanceService;
