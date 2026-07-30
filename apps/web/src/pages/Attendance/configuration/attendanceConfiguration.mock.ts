import type {
  AcademicYearOption,
  AttendanceConfigurationState,
  AttendanceStatusItem,
  NotificationSetting,
  PublicHoliday,
  Shift,
} from "./attendanceConfiguration.types";

export const MOCK_ACADEMIC_YEARS: AcademicYearOption[] = [
  { id: "ay-2025-26", label: "2025-26" },
  { id: "ay-2024-25", label: "2024-25" },
  { id: "ay-2023-24", label: "2023-24" },
];

const MOCK_HOLIDAYS: PublicHoliday[] = [
  {
    id: "hol-1",
    name: "Republic Day",
    date: "2026-01-26",
    description: "National holiday",
    status: "active",
  },
  {
    id: "hol-2",
    name: "Holi",
    date: "2026-03-14",
    description: "Festival of colors",
    status: "active",
  },
  {
    id: "hol-3",
    name: "Independence Day",
    date: "2026-08-15",
    description: "National holiday",
    status: "active",
  },
];

const MOCK_SHIFTS: Shift[] = [
  {
    id: "shift-1",
    name: "Morning Shift",
    startTime: "08:00",
    endTime: "14:00",
    status: "active",
  },
  {
    id: "shift-2",
    name: "Afternoon Shift",
    startTime: "12:00",
    endTime: "18:00",
    status: "active",
  },
];

const MOCK_STATUSES: AttendanceStatusItem[] = [
  { id: "st-present", name: "Present", color: "#22c55e", active: true },
  { id: "st-absent", name: "Absent", color: "#ef4444", active: true },
  { id: "st-late", name: "Late", color: "#f59e0b", active: true },
  { id: "st-half-day", name: "Half Day", color: "#8b5cf6", active: true },
  { id: "st-leave", name: "Leave", color: "#3b82f6", active: true },
  { id: "st-holiday", name: "Holiday", color: "#64748b", active: true },
  { id: "st-others", name: "Others", color: "#94a3b8", active: true },
];

const MOCK_NOTIFICATIONS: NotificationSetting[] = [
  {
    id: "notif-missed",
    label: "Missed Attendance Alert",
    recipients: ["teacher", "schoolAdmin"],
    triggers: ["missedAttendance"],
    channels: ["sms"],
    enabled: true,
  },
];


export const HOLIDAY_WARNING_MESSAGE =
  "This date is a configured holiday. Do you want to continue?";

export function createInitialAttendanceConfiguration(): AttendanceConfigurationState {
  return {
    general: {
      academicYearId: MOCK_ACADEMIC_YEARS[0].id,
      configurationScope: "entire-school",
      allowEditingAfterMarked: true,
      applyChangesTo: "future-only",
      attendanceMarkedBy: {
        teacher: true,
        schoolAdmin: true,
      },
    },
    workingDays: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false,
    },
    holidays: MOCK_HOLIDAYS,
    shifts: MOCK_SHIFTS,
    officeTiming: {
      startTime: "08:00",
      endTime: "16:00",
      minimumWorkingHours: 6,
    },
    graceTime: {
      enabled: true,
      graceMinutes: 15,
      statusAfterGrace: "Late",
    },
    statuses: MOCK_STATUSES,
    checkInRules: {
      checkInMandatory: true,
      checkOutMandatory: true,
      allowAttendanceWithoutCheckOut: false,
      allowMultipleCheckIn: false,
      allowNextDayCheckOut: false,
      autoCalculateWorkingHours: true,
    },
    notifications: MOCK_NOTIFICATIONS,
  };
}
