import type { AcademicYear } from "../api/services/academicYearService";
import { isWeekendIso } from "../pages/calendar/academicCalendar.utils";

export type AttendanceDateLockReason = "weekend" | "holiday" | "future" | "outside_year";

export interface AttendanceDateLockInfo {
  locked: boolean;
  reason?: AttendanceDateLockReason;
  message?: string;
}

export function expandIsoDateRange(start: string, end: string): string[] {
  const startMs = Date.parse(`${start}T00:00:00`);
  const endMs = Date.parse(`${(end || start)}T00:00:00`);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return [];
  const dates: string[] = [];
  for (let t = startMs; t <= endMs; t += 86400000) {
    const d = new Date(t);
    dates.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    );
  }
  return dates;
}

export function buildNonWorkingDateMap(
  items: Record<string, string> | Array<{ date: string; reason: string }>
): Map<string, string> {
  const map = new Map<string, string>();
  if (Array.isArray(items)) {
    for (const item of items) {
      const iso = item.date?.slice(0, 10);
      if (iso) map.set(iso, item.reason);
    }
    return map;
  }
  for (const [iso, reason] of Object.entries(items)) {
    map.set(iso.slice(0, 10), reason);
  }
  return map;
}

export function getAttendanceDateLockInfo(
  iso: string,
  options: {
    today: string;
    academicYear?: AcademicYear | null;
    nonWorkingDates?: Map<string, string>;
  }
): AttendanceDateLockInfo {
  if (!iso) return { locked: true, reason: "outside_year", message: "Please select a date" };

  if (iso > options.today) {
    return {
      locked: true,
      reason: "future",
      message: "You cannot mark attendance for future dates",
    };
  }

  const year = options.academicYear;
  if (year) {
    if (iso < year.start_date || iso > year.end_date) {
      return {
        locked: true,
        reason: "outside_year",
        message: "Selected date is outside the academic year",
      };
    }
  }

  if (isWeekendIso(iso)) {
    return {
      locked: true,
      reason: "weekend",
      message: "Attendance cannot be marked on weekends",
    };
  }

  const holidayReason = options.nonWorkingDates?.get(iso);
  if (holidayReason) {
    return {
      locked: true,
      reason: "holiday",
      message: `Attendance cannot be marked on non-working days (${holidayReason})`,
    };
  }

  return { locked: false };
}

export function findPreviousWorkingDate(
  fromIso: string,
  options: {
    minDate?: string;
    today: string;
    academicYear?: AcademicYear | null;
    nonWorkingDates?: Map<string, string>;
  }
): string | null {
  const startMs = Date.parse(`${fromIso}T00:00:00`);
  if (!Number.isFinite(startMs)) return null;

  const minBound = options.minDate ?? options.academicYear?.start_date;
  const maxBound = options.today;

  for (let t = startMs; t >= Date.parse(`${(minBound || fromIso)}T00:00:00`); t -= 86400000) {
    const d = new Date(t);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (maxBound && iso > maxBound) continue;
    const lock = getAttendanceDateLockInfo(iso, {
      today: options.today,
      academicYear: options.academicYear,
      nonWorkingDates: options.nonWorkingDates,
    });
    if (!lock.locked) return iso;
  }
  return null;
}

export function resolveDefaultAttendanceDate(
  today: string,
  options: {
    academicYear?: AcademicYear | null;
    nonWorkingDates?: Map<string, string>;
  }
): string {
  const lock = getAttendanceDateLockInfo(today, {
    today,
    academicYear: options.academicYear,
    nonWorkingDates: options.nonWorkingDates,
  });
  if (!lock.locked) return today;

  const previous = findPreviousWorkingDate(today, {
    today,
    academicYear: options.academicYear,
    nonWorkingDates: options.nonWorkingDates,
  });
  return previous ?? today;
}
