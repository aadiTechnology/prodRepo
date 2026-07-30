export type AcademicYearOption = {
  id: string;
  label: string;
};

export type ConfigurationScope = "entire-school";

export type ApplyChangesTo = "future-only";

export type AttendanceMarkedBy = {
  teacher: boolean;
  schoolAdmin: boolean;
};

export type WorkingDayKey =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type WorkingDaysConfig = Record<WorkingDayKey, boolean>;

export type EntityStatus = "active" | "inactive";

export type PublicHoliday = {
  id: string;
  name: string;
  date: string;
  description: string;
  status: EntityStatus;
};

export type Shift = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  status: EntityStatus;
};

export type OfficeTiming = {
  startTime: string;
  endTime: string;
  minimumWorkingHours: number;
};

export type GraceTimeConfig = {
  enabled: boolean;
  graceMinutes: number;
  statusAfterGrace: string;
};

export type AttendanceStatusItem = {
  id: string;
  name: string;
  color: string;
  active: boolean;
};

export type CheckInRules = {
  checkInMandatory: boolean;
  checkOutMandatory: boolean;
  allowAttendanceWithoutCheckOut: boolean;
  allowMultipleCheckIn: boolean;
  allowNextDayCheckOut: boolean;
  autoCalculateWorkingHours: boolean;
};

export type NotificationChannel = "sms";

export type NotificationRecipient = "teacher" | "schoolAdmin";

export type NotificationTrigger = "missedAttendance";

export type NotificationSetting = {
  id: string;
  label: string;
  recipients: NotificationRecipient[];
  triggers: NotificationTrigger[];
  channels: NotificationChannel[];
  enabled: boolean;
};

export type GeneralConfiguration = {
  academicYearId: string;
  configurationScope: ConfigurationScope;
  allowEditingAfterMarked: boolean;
  applyChangesTo: ApplyChangesTo;
  attendanceMarkedBy: AttendanceMarkedBy;
};

export type AttendanceConfigurationState = {
  general: GeneralConfiguration;
  workingDays: WorkingDaysConfig;
  holidays: PublicHoliday[];
  shifts: Shift[];
  officeTiming: OfficeTiming;
  graceTime: GraceTimeConfig;
  statuses: AttendanceStatusItem[];
  checkInRules: CheckInRules;
  notifications: NotificationSetting[];
};

export type AttendanceConfigSectionId =
  | "general"
  | "working-days"
  | "public-holidays"
  | "shifts"
  | "office-timing"
  | "grace-time"
  | "attendance-status"
  | "notifications";

export type HolidayFormValues = {
  name: string;
  date: string;
  description: string;
  status: EntityStatus;
};

export type ShiftFormValues = {
  name: string;
  startTime: string;
  endTime: string;
  status: EntityStatus;
};

export type StatusFormValues = {
  name: string;
  color: string;
  active: boolean;
};
