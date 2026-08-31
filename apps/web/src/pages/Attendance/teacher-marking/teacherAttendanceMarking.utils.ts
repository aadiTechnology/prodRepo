import type {
  TeacherAttendanceRecord,
  TeacherAttendanceStatus,
  TeacherProfile,
} from "./teacherAttendanceMarking.types";

export function getTodayIso(): string {
  const d = new Date();
  return toIsoDate(d.getFullYear(), d.getMonth(), d.getDate());
}

/** First day of the current month (YYYY-MM-DD). */
export function getCurrentMonthStartIso(): string {
  const d = new Date();
  return toIsoDate(d.getFullYear(), d.getMonth(), 1);
}

/** Default report-style range start (e.g. last 7 days through today). */
export function getDefaultFromDateIso(daysBack = 7): string {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  return toIsoDate(d.getFullYear(), d.getMonth(), d.getDate());
}

export function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function formatCurrentTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

/** 12-hour display for check-in/out fields (matches admin list view). */
export function formatAttendanceTimeDisplay(time: string | null | undefined): string {
  if (!time) return "—";
  const [hour, minute] = time.split(":");
  const h = Number(hour);
  const m = Number(minute);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return "—";
  const ampm = h >= 12 ? "PM" : "AM";
  const displayHour = h % 12 || 12;
  return `${String(displayHour).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
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

/** Approval queue is past attendance only — today's live check-in/out stays in list view. */
export function isPastAttendanceDate(dateIso: string, todayIso: string): boolean {
  return dateIso < todayIso;
}

export function isApprovalQueueRecord(
  record: Pick<TeacherAttendanceRecord, "date" | "isSubmitted">,
  todayIso: string
): boolean {
  return record.isSubmitted && isPastAttendanceDate(record.date, todayIso);
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

/** Inclusive ISO date strings from `fromIso` through `toIso`, newest first. */
export function listDatesInRange(fromIso: string, toIso: string): string[] {
  if (!fromIso || !toIso || fromIso > toIso) return [];

  const dates: string[] = [];
  const cursor = new Date(`${fromIso}T00:00:00`);
  const end = new Date(`${toIso}T00:00:00`);

  while (cursor <= end) {
    dates.push(toIsoDate(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates.reverse();
}

/** Admin list view: one row per teacher per date (check-in/out when marked, otherwise blank). */
export function buildAttendanceListGrid(
  teachers: TeacherProfile[],
  dates: string[],
  records: TeacherAttendanceRecord[]
): TeacherAttendanceRecord[] {
  const recordByKey = new Map(records.map((r) => [`${r.teacherId}:${r.date}`, r]));
  const sortedTeachers = [...teachers].sort((a, b) => a.name.localeCompare(b.name));
  const rows: TeacherAttendanceRecord[] = [];

  for (const date of dates) {
    for (const teacher of sortedTeachers) {
      const existing = recordByKey.get(`${teacher.id}:${date}`);
      if (existing) {
        rows.push(existing);
        continue;
      }

      rows.push({
        id: `grid-${teacher.id}-${date}`,
        teacherId: teacher.id,
        date,
        statuses: [] as TeacherAttendanceStatus[],
        checkInTime: null,
        checkOutTime: null,
        remarks: "",
        remarkHistory: [],
        workingHoursMinutes: null,
        overtimeMinutes: null,
        isSubmitted: false,
        payrollProcessed: false,
        approvalStatus: "Waiting for Approval",
        rejectionReason: "",
      });
    }
  }

  return rows;
}
