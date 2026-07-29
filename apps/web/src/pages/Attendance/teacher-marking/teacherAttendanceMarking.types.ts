export type ApprovalStatus = "Waiting for Approval" | "Approved" | "Rejected";

export type TeacherAttendanceStatus =
  | "Present"
  | "Absent"
  | "Late"
  | "Half Day"
  | "Leave"
  | "Holiday"
  | "Others";

export type TeacherEmploymentStatus = "active" | "inactive" | "resigned";

export interface TeacherProfile {
  id: string;
  name: string;
  employmentStatus: TeacherEmploymentStatus;
  shiftId: string;
}

export interface ShiftInfo {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
}

export interface OfficeTimingInfo {
  startTime: string;
  endTime: string;
  minimumWorkingHours: number;
}

export interface GraceTimeInfo {
  enabled: boolean;
  graceMinutes: number;
}

export interface RemarkHistoryEntry {
  id: string;
  text: string;
  updatedBy: string;
  updatedAt: string;
}

export interface TeacherAttendanceRecord {
  id: string;
  teacherId: string;
  date: string;
  statuses: TeacherAttendanceStatus[];
  checkInTime: string | null;
  checkOutTime: string | null;
  remarks: string;
  remarkHistory: RemarkHistoryEntry[];
  workingHoursMinutes: number | null;
  overtimeMinutes: number | null;
  isSubmitted: boolean;
  payrollProcessed: boolean;
  approvalStatus: ApprovalStatus;
  rejectionReason?: string;
}

export interface AttendanceHistoryFilters {
  date: string;
  teacherSearch: string;
  month: string;
  status: TeacherAttendanceStatus | "";
  shiftId: string;
}

export interface TodaySummary {
  totalTeachers: number;
  present: number;
  absent: number;
  late: number;
  leave: number;
}

export interface MissedAttendanceAlert {
  teacherId: string;
  teacherName: string;
  date: string;
}

export const APPROVAL_STATUS_OPTIONS: ApprovalStatus[] = [
  "Waiting for Approval",
  "Approved",
  "Rejected",
];

export const ATTENDANCE_STATUS_OPTIONS: TeacherAttendanceStatus[] = [
  "Present",
  "Absent",
  "Late",
  "Half Day",
  "Leave",
  "Holiday",
  "Others",
];

export const REMARKS_REQUIRED_STATUSES: TeacherAttendanceStatus[] = [
  "Absent",
  "Leave",
  "Half Day",
];

export const MAX_REMARKS_LENGTH = 50;
