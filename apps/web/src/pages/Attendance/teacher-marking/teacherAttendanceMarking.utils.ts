import type { TeacherAttendanceStatus } from "./teacherAttendanceMarking.types";

export function getTodayIso(): string {
  const d = new Date();
  return toIsoDate(d.getFullYear(), d.getMonth(), d.getDate());
}

export function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function formatCurrentTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

export function isFutureDate(iso: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(`${iso}T00:00:00`);
  return d > today;
}

export function calculateWorkingHours(checkIn: string, checkOut: string): number {
  return Math.max(0, parseTimeToMinutes(checkOut) - parseTimeToMinutes(checkIn));
}

export function calculateOvertime(
  workingMinutes: number,
  checkIn: string,
  shiftEnd: string
): number {
  const actualEnd = parseTimeToMinutes(checkIn) + workingMinutes;
  const expectedEnd = parseTimeToMinutes(shiftEnd);
  return Math.max(0, actualEnd - expectedEnd);
}

export function resolveStatusAfterCheckIn(
  checkInTime: string,
  shiftStart: string,
  graceEnabled: boolean,
  graceMinutes: number
): TeacherAttendanceStatus {
  if (!graceEnabled) return "Present";
  const checkInMin = parseTimeToMinutes(checkInTime);
  const shiftStartMin = parseTimeToMinutes(shiftStart);
  if (checkInMin > shiftStartMin + graceMinutes) return "Late";
  return "Present";
}

export function primaryCalendarStatus(
  statuses: TeacherAttendanceStatus[]
): TeacherAttendanceStatus | undefined {
  if (statuses.length === 0) return undefined;
  const priority: TeacherAttendanceStatus[] = [
    "Absent",
    "Late",
    "Leave",
    "Half Day",
    "Holiday",
    "Others",
    "Present",
  ];
  for (const status of priority) {
    if (statuses.includes(status)) return status;
  }
  return statuses[0];
}

export function isWeekend(iso: string): boolean {
  const d = new Date(`${iso}T00:00:00`);
  const dayOfWeek = d.getDay();
  // 0 = Sunday, 6 = Saturday
  return dayOfWeek === 0 || dayOfWeek === 6;
}

export function isHoliday(iso: string, holidays: Record<string, string>): boolean {
  return iso in holidays;
}

export function isWorkingDay(
  iso: string,
  workingDays: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  }
): boolean {
  const d = new Date(`${iso}T00:00:00`);
  const dayOfWeek = d.getDay();
  // Map: Sunday=0, Monday=1, ..., Saturday=6
  const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
  const dayName = daysOfWeek[dayOfWeek];
  return workingDays[dayName] ?? false;
}
