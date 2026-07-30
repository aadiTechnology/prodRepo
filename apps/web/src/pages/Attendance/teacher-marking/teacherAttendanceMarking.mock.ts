import { createInitialAttendanceConfiguration } from "../configuration/attendanceConfiguration.mock";
import type {
  GraceTimeInfo,
  OfficeTimingInfo,
  ShiftInfo,
  TeacherAttendanceRecord,
  TeacherProfile,
} from "./teacherAttendanceMarking.types";
import { getTodayIso } from "./teacherAttendanceMarking.utils";

const config = createInitialAttendanceConfiguration();

export const MOCK_SHIFTS: ShiftInfo[] = config.shifts.map((s) => ({
  id: s.id,
  name: s.name,
  startTime: s.startTime,
  endTime: s.endTime,
}));

export const MOCK_OFFICE_TIMING: OfficeTimingInfo = {
  startTime: config.officeTiming.startTime,
  endTime: config.officeTiming.endTime,
  minimumWorkingHours: config.officeTiming.minimumWorkingHours,
};

export const MOCK_GRACE_TIME: GraceTimeInfo = {
  enabled: config.graceTime.enabled,
  graceMinutes: config.graceTime.graceMinutes,
};

export const MOCK_TEACHERS: TeacherProfile[] = [
  { id: "admin-self", name: "School Admin", employmentStatus: "active", shiftId: "shift-1" },
  { id: "teacher-1", name: "Priya Sharma", employmentStatus: "active", shiftId: "shift-1" },
  { id: "teacher-2", name: "Rahul Mehta", employmentStatus: "active", shiftId: "shift-1" },
  { id: "teacher-3", name: "Anita Desai", employmentStatus: "active", shiftId: "shift-2" },
  { id: "teacher-4", name: "Vikram Singh", employmentStatus: "inactive", shiftId: "shift-1" },
  { id: "teacher-5", name: "Sunita Rao", employmentStatus: "resigned", shiftId: "shift-2" },
];

const today = getTodayIso();
const yesterday = offsetDate(today, -1);
const twoDaysAgo = offsetDate(today, -2);

function offsetDate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function createInitialTeacherAttendanceRecords(): TeacherAttendanceRecord[] {
  return [
    {
      id: "tar-1",
      teacherId: "teacher-1",
      date: twoDaysAgo,
      statuses: ["Present"],
      checkInTime: "08:05",
      checkOutTime: "14:10",
      remarks: "",
      remarkHistory: [],
      workingHoursMinutes: 365,
      overtimeMinutes: 10,
      isSubmitted: true,
      payrollProcessed: true,
      approvalStatus: "Approved",
    },
    {
      id: "tar-2",
      teacherId: "teacher-2",
      date: yesterday,
      statuses: ["Late"],
      checkInTime: "08:22",
      checkOutTime: "14:05",
      remarks: "",
      remarkHistory: [],
      workingHoursMinutes: 343,
      overtimeMinutes: 0,
      isSubmitted: true,
      payrollProcessed: false,
      approvalStatus: "Waiting for Approval",
    },
    {
      id: "tar-3",
      teacherId: "teacher-3",
      date: yesterday,
      statuses: ["Half Day", "Leave"],
      checkInTime: "12:10",
      checkOutTime: "15:00",
      remarks: "Medical appointment",
      remarkHistory: [
        {
          id: "rh-1",
          text: "Medical appointment",
          updatedBy: "Anita Desai",
          updatedAt: `${yesterday}T15:05:00`,
        },
      ],
      workingHoursMinutes: 170,
      overtimeMinutes: 0,
      isSubmitted: true,
      payrollProcessed: false,
      approvalStatus: "Rejected",
    },
    {
      id: "tar-4",
      teacherId: "teacher-1",
      date: yesterday,
      statuses: ["Present"],
      checkInTime: "07:58",
      checkOutTime: "14:02",
      remarks: "",
      remarkHistory: [],
      workingHoursMinutes: 364,
      overtimeMinutes: 2,
      isSubmitted: true,
      payrollProcessed: false,
      approvalStatus: "Approved",
    },
    {
      id: "tar-5",
      teacherId: "teacher-2",
      date: today,
      statuses: ["Present"],
      checkInTime: "08:02",
      checkOutTime: null,
      remarks: "",
      remarkHistory: [],
      workingHoursMinutes: null,
      overtimeMinutes: null,
      isSubmitted: false,
      payrollProcessed: false,
      approvalStatus: "Waiting for Approval",
    },
  ];
}

/** Maps auth user id/email to a mock teacher for the teacher self-service flow. */
export const MOCK_LOGGED_IN_TEACHER_ID = "teacher-1";

/** Mock admin identity for admin self check-in/out on tab 1. */
export const MOCK_LOGGED_IN_ADMIN_ID = "admin-self";

export function getActiveTeachers(): TeacherProfile[] {
  return MOCK_TEACHERS.filter((t) => t.employmentStatus === "active");
}

export function getShiftById(shiftId: string): ShiftInfo | undefined {
  return MOCK_SHIFTS.find((s) => s.id === shiftId);
}

export function getTeacherById(teacherId: string): TeacherProfile | undefined {
  return MOCK_TEACHERS.find((t) => t.id === teacherId);
}
