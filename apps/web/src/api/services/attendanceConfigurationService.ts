/**
 * Attendance Configuration API — Configuration Hub → Attendance Configuration.
 * Backend: /api/attendance/configuration
 */

import apiClient from "../client";
import type {
  AttendanceConfigurationState,
  AttendanceStatusItem,
  CheckInRules,
  EntityStatus,
  GraceTimeConfig,
  HolidayFormValues,
  NotificationSetting,
  OfficeTiming,
  PublicHoliday,
  Shift,
  ShiftFormValues,
  StatusFormValues,
  WorkingDaysConfig,
} from "../../pages/Attendance/configuration/attendanceConfiguration.types";

const BASE = "/api/attendance/configuration";

// ── API shapes (snake_case from FastAPI) ────────────────────────────────────

export interface AttendanceConfigurationApiResponse {
  id: number;
  tenant_id: number;
  general: {
    academic_year_id: number;
    configuration_scope: "entire-school";
    allow_editing_after_marked: boolean;
    apply_changes_to: "future-only";
    attendance_marked_by: { teacher: boolean; school_admin: boolean };
  };
  working_days: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
  holidays: Array<{
    id: number;
    name: string;
    holiday_date: string;
    description: string | null;
    status: string;
    created_at: string;
    updated_at: string | null;
  }>;
  shifts: Array<{
    id: number;
    name: string;
    start_time: string;
    end_time: string;
    status: string;
    created_at: string;
    updated_at: string | null;
  }>;
  office_timing: {
    start_time: string;
    end_time: string;
    minimum_working_hours: number;
  };
  grace_time: {
    enabled: boolean;
    grace_minutes: number;
    status_after_grace: string;
  };
  statuses: Array<{
    id: number;
    name: string;
    color: string;
    is_active: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string | null;
  }>;
  check_in_rules: {
    check_in_mandatory: boolean;
    check_out_mandatory: boolean;
    allow_attendance_without_check_out: boolean;
    allow_multiple_check_in: boolean;
    allow_next_day_check_out: boolean;
    auto_calculate_working_hours: boolean;
  };
  notifications: Array<{
    id: number;
    label: string;
    recipients: Array<"teacher" | "schoolAdmin">;
    triggers: Array<"missedAttendance">;
    channels: Array<"sms">;
    is_enabled: boolean;
    created_at: string;
    updated_at: string | null;
  }>;
  created_at: string;
  updated_at: string | null;
}

export type AttendanceConfigurationUpdatePayload = {
  allow_editing_after_marked?: boolean;
  apply_changes_to?: "future-only";
  attendance_marked_by?: { teacher: boolean; school_admin: boolean };
  working_days?: WorkingDaysConfig;
  office_timing?: {
    start_time: string;
    end_time: string;
    minimum_working_hours: number;
  };
  grace_time?: {
    enabled: boolean;
    grace_minutes: number;
    status_after_grace: string;
  };
  check_in_rules?: {
    check_in_mandatory: boolean;
    check_out_mandatory: boolean;
    allow_attendance_without_check_out: boolean;
    allow_multiple_check_in: boolean;
    allow_next_day_check_out: boolean;
    auto_calculate_working_hours: boolean;
  };
};

// ── Mappers: API → UI ───────────────────────────────────────────────────────

export function mapConfigurationToState(
  data: AttendanceConfigurationApiResponse
): AttendanceConfigurationState {
  return {
    general: {
      academicYearId: String(data.general.academic_year_id),
      configurationScope: data.general.configuration_scope,
      allowEditingAfterMarked: data.general.allow_editing_after_marked,
      applyChangesTo: data.general.apply_changes_to,
      attendanceMarkedBy: {
        teacher: data.general.attendance_marked_by.teacher,
        schoolAdmin: data.general.attendance_marked_by.school_admin,
      },
    },
    workingDays: {
      monday: data.working_days.monday,
      tuesday: data.working_days.tuesday,
      wednesday: data.working_days.wednesday,
      thursday: data.working_days.thursday,
      friday: data.working_days.friday,
      saturday: data.working_days.saturday,
      sunday: data.working_days.sunday,
    },
    holidays: data.holidays.map(
      (h): PublicHoliday => ({
        id: String(h.id),
        name: h.name,
        date: String(h.holiday_date).slice(0, 10),
        description: h.description ?? "",
        status: (h.status === "inactive" ? "inactive" : "active") as EntityStatus,
      })
    ),
    shifts: data.shifts.map(
      (s): Shift => ({
        id: String(s.id),
        name: s.name,
        startTime: s.start_time,
        endTime: s.end_time,
        status: (s.status === "inactive" ? "inactive" : "active") as EntityStatus,
      })
    ),
    officeTiming: {
      startTime: data.office_timing.start_time,
      endTime: data.office_timing.end_time,
      minimumWorkingHours: data.office_timing.minimum_working_hours,
    },
    graceTime: {
      enabled: data.grace_time.enabled,
      graceMinutes: data.grace_time.grace_minutes,
      statusAfterGrace: data.grace_time.status_after_grace,
    },
    statuses: data.statuses.map(
      (s): AttendanceStatusItem => ({
        id: String(s.id),
        name: s.name,
        color: s.color,
        active: !!s.is_active,
      })
    ),
    checkInRules: {
      checkInMandatory: data.check_in_rules.check_in_mandatory,
      checkOutMandatory: data.check_in_rules.check_out_mandatory,
      allowAttendanceWithoutCheckOut: data.check_in_rules.allow_attendance_without_check_out,
      allowMultipleCheckIn: data.check_in_rules.allow_multiple_check_in,
      allowNextDayCheckOut: data.check_in_rules.allow_next_day_check_out,
      autoCalculateWorkingHours: data.check_in_rules.auto_calculate_working_hours,
    },
    notifications: data.notifications.map(
      (n): NotificationSetting => ({
        id: String(n.id),
        label: n.label,
        recipients: n.recipients,
        triggers: n.triggers,
        channels: n.channels,
        enabled: !!n.is_enabled,
      })
    ),
  };
}

export function toOfficeTimingPayload(officeTiming: OfficeTiming) {
  return {
    start_time: officeTiming.startTime,
    end_time: officeTiming.endTime,
    minimum_working_hours: officeTiming.minimumWorkingHours,
  };
}

export function toGraceTimePayload(graceTime: GraceTimeConfig) {
  return {
    enabled: graceTime.enabled,
    grace_minutes: graceTime.graceMinutes,
    status_after_grace: graceTime.statusAfterGrace,
  };
}

export function toCheckInRulesPayload(checkInRules: CheckInRules) {
  return {
    check_in_mandatory: checkInRules.checkInMandatory,
    check_out_mandatory: checkInRules.checkOutMandatory,
    allow_attendance_without_check_out: checkInRules.allowAttendanceWithoutCheckOut,
    allow_multiple_check_in: checkInRules.allowMultipleCheckIn,
    allow_next_day_check_out: checkInRules.allowNextDayCheckOut,
    auto_calculate_working_hours: checkInRules.autoCalculateWorkingHours,
  };
}

export function getAttendanceConfigErrorMessage(error: unknown, fallback: string): string {
  const ax = error as {
    response?: { data?: { detail?: string | Array<{ msg?: string }> | { message?: string } } };
    message?: string;
  };
  const detail = ax?.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const joined = detail
      .map((d) => (typeof d === "object" && d?.msg ? d.msg : String(d)))
      .filter(Boolean)
      .join(", ");
    if (joined) return joined;
  }
  if (detail && typeof detail === "object" && "message" in detail && detail.message) {
    return String(detail.message);
  }
  return ax?.message || fallback;
}

// ── API methods ─────────────────────────────────────────────────────────────

const attendanceConfigurationService = {
  get: async (academicYearId: number): Promise<AttendanceConfigurationState> => {
    const response = await apiClient.get<AttendanceConfigurationApiResponse>(BASE, {
      params: { academic_year_id: academicYearId },
    });
    return mapConfigurationToState(response.data);
  },

  updateSettings: async (
    academicYearId: number,
    payload: AttendanceConfigurationUpdatePayload
  ): Promise<AttendanceConfigurationState> => {
    const response = await apiClient.put<AttendanceConfigurationApiResponse>(
      BASE,
      payload,
      { params: { academic_year_id: academicYearId } }
    );
    return mapConfigurationToState(response.data);
  },

  createHoliday: async (
    academicYearId: number,
    values: HolidayFormValues
  ): Promise<AttendanceConfigurationState> => {
    await apiClient.post(
      `${BASE}/holidays`,
      {
        name: values.name,
        holiday_date: values.date,
        description: values.description || null,
        status: values.status,
      },
      { params: { academic_year_id: academicYearId } }
    );
    return attendanceConfigurationService.get(academicYearId);
  },

  updateHoliday: async (
    academicYearId: number,
    holidayId: number,
    values: HolidayFormValues
  ): Promise<AttendanceConfigurationState> => {
    await apiClient.put(`${BASE}/holidays/${holidayId}`, {
      name: values.name,
      holiday_date: values.date,
      description: values.description || null,
      status: values.status,
    });
    return attendanceConfigurationService.get(academicYearId);
  },

  deleteHoliday: async (
    academicYearId: number,
    holidayId: number
  ): Promise<AttendanceConfigurationState> => {
    await apiClient.delete(`${BASE}/holidays/${holidayId}`);
    return attendanceConfigurationService.get(academicYearId);
  },

  createShift: async (
    academicYearId: number,
    values: ShiftFormValues
  ): Promise<AttendanceConfigurationState> => {
    await apiClient.post(
      `${BASE}/shifts`,
      {
        name: values.name,
        start_time: values.startTime,
        end_time: values.endTime,
        status: values.status,
      },
      { params: { academic_year_id: academicYearId } }
    );
    return attendanceConfigurationService.get(academicYearId);
  },

  updateShift: async (
    academicYearId: number,
    shiftId: number,
    values: ShiftFormValues
  ): Promise<AttendanceConfigurationState> => {
    await apiClient.put(`${BASE}/shifts/${shiftId}`, {
      name: values.name,
      start_time: values.startTime,
      end_time: values.endTime,
      status: values.status,
    });
    return attendanceConfigurationService.get(academicYearId);
  },

  deleteShift: async (
    academicYearId: number,
    shiftId: number
  ): Promise<AttendanceConfigurationState> => {
    await apiClient.delete(`${BASE}/shifts/${shiftId}`);
    return attendanceConfigurationService.get(academicYearId);
  },

  createStatus: async (
    academicYearId: number,
    values: StatusFormValues
  ): Promise<AttendanceConfigurationState> => {
    await apiClient.post(
      `${BASE}/statuses`,
      {
        name: values.name,
        color: values.color,
        is_active: values.active,
      },
      { params: { academic_year_id: academicYearId } }
    );
    return attendanceConfigurationService.get(academicYearId);
  },

  updateStatus: async (
    academicYearId: number,
    statusId: number,
    values: StatusFormValues
  ): Promise<AttendanceConfigurationState> => {
    await apiClient.put(`${BASE}/statuses/${statusId}`, {
      name: values.name,
      color: values.color,
      is_active: values.active,
    });
    return attendanceConfigurationService.get(academicYearId);
  },

  deleteStatus: async (
    academicYearId: number,
    statusId: number
  ): Promise<AttendanceConfigurationState> => {
    await apiClient.delete(`${BASE}/statuses/${statusId}`);
    return attendanceConfigurationService.get(academicYearId);
  },

  toggleNotification: async (
    academicYearId: number,
    notificationId: number,
    enabled: boolean
  ): Promise<AttendanceConfigurationState> => {
    await apiClient.patch(`${BASE}/notifications/${notificationId}`, {
      is_enabled: enabled,
    });
    return attendanceConfigurationService.get(academicYearId);
  },
};

export default attendanceConfigurationService;


// ── Holiday Calendar API ─────────────────────────────────────────────────────

export interface HolidayCalendarItem {
  id: number;
  name: string;
  holiday_date: string;
  description: string;
  status: string;
}

/**
 * Get holidays for calendar display in teacher attendance
 * @param fromDate - Start date (YYYY-MM-DD)
 * @param toDate - End date (YYYY-MM-DD)
 * @returns List of holidays in the date range
 */
export async function getHolidaysForCalendar(
  fromDate: string,
  toDate: string
): Promise<HolidayCalendarItem[]> {
  const response = await apiClient.get<HolidayCalendarItem[]>(
    `${BASE}/holidays/calendar`,
    {
      params: {
        from_date: fromDate,
        to_date: toDate,
      },
    }
  );
  return response.data;
}
