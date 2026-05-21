import axiosInstance from "../client";

export interface AttendanceOverview {
  present: number;
  absent: number;
  half_day: number;
  leave: number;
}

export interface LeadStatusCount {
  status: string;
  color_code: string | null;
  count: number;
}

export interface FeeCollectionSummary {
  total_fee: number;
  total_paid: number;
  total_balance: number;
}

export interface ClassStudentCount {
  class_name: string;
  count: number;
}

export interface StudentSnapshot {
  active_students: number;
  total_classes: number;
  boys_count: number;
  girls_count: number;
  class_breakdown: ClassStudentCount[];
}

export interface RecentNoticeItem {
  id: number;
  title: string;
  notice_type: string;
  published_at: string | null;
  priority: string | null;
}

export interface AdminDashboardData {
  attendance_overview: AttendanceOverview;
  lead_pipeline: LeadStatusCount[];
  fee_collection: FeeCollectionSummary;
  student_snapshot: StudentSnapshot;
  recent_notices: RecentNoticeItem[];
}

export interface AssignedClassInfo {
  class_id: number;
  class_name: string;
  division_id: number;
  division_name: string;
  student_count: number;
  boys_count: number;
  girls_count: number;
  new_this_month: number;
}

export interface AbsenteeDetail {
  student_id: number;
  student_name: string;
  class_name: string;
  division_name: string;
  remarks: string | null;
}

export interface WeeklyTrendPoint {
  date: string;
  present_rate: number;
}

export interface TeacherDashboardData {
  assigned_classes: AssignedClassInfo[];
  today_attendance: AttendanceOverview;
  absentees_list: AbsenteeDetail[];
  weekly_trend: WeeklyTrendPoint[];
  recent_notices: RecentNoticeItem[];
}

export interface StudentProfileInfo {
  student_id: number;
  student_name: string;
  roll_no: string | null;
  admission_no: string | null;
  class_name: string | null;
  division_name: string | null;
  photo_url: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  admission_date: string | null;
}

export interface StudentAttendanceSummary {
  present: number;
  absent: number;
  half_day: number;
  leave: number;
  percentage: number;
}

export interface StudentFeeStatus {
  total_fee: number;
  total_paid: number;
  total_balance: number;
  is_overdue: boolean;
  next_due_date: string | null;
}

export interface StudentHomeworkSummary {
  pending_count: number;
  total_count: number;
}

export interface StudentDashboardData {
  profile: StudentProfileInfo;
  attendance: StudentAttendanceSummary;
  fee_status: StudentFeeStatus;
  class_teacher: string | null;
  homework: StudentHomeworkSummary;
  recent_notices: RecentNoticeItem[];
}

export interface DashboardResponse {
  role: "SYSTEM_ADMIN" | "TENANT_ADMIN" | "TEACHER" | "STUDENT";
  data: AdminDashboardData | TeacherDashboardData | StudentDashboardData | null;
}

export interface DashboardFetchParams {
  /** Global date range (fallback when no section-specific range is provided) */
  startDate?: string;
  endDate?: string;
  /** Attendance section — specific date range */
  attStart?: string;
  attEnd?: string;
  /** Fee section — specific date range */
  feeStart?: string;
  feeEnd?: string;
}

const dashboardService = {
  async getDashboardData(params: DashboardFetchParams = {}): Promise<DashboardResponse> {
    const { data } = await axiosInstance.get<DashboardResponse>("/api/dashboard/me", {
      params: {
        start_date: params.startDate,
        end_date: params.endDate,
        att_start_date: params.attStart,
        att_end_date: params.attEnd,
        fee_start_date: params.feeStart,
        fee_end_date: params.feeEnd,
      },
    });
    return data;
  },
};

export default dashboardService;
