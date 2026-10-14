import type { ExtraWorkingTeacher, PublicHoliday, WorkingDaysConfig, WorkingDayKey, DateShiftOverride } from "./attendanceConfiguration.types";
import { formatTimeRange12Hour } from "../../../utils/formatters";
import { getDateShiftTimingLines } from "./dateShiftTiming.utils";

const WEEKDAY_KEYS: WorkingDayKey[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export type WorkingDayCellKind = "working" | "holiday" | "weekend";

export type WorkingDayPreviewCell = {
  iso: string;
  day: number;
  inMonth: boolean;
  kind: WorkingDayCellKind;
  statusLabel: string;
  extraTeacherNames: string[];
  shiftTimingLines: string[];
};

export const toIsoDate = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

export function isoToWorkingDayKey(iso: string): WorkingDayKey {
  return WEEKDAY_KEYS[new Date(`${iso}T00:00:00`).getDay()];
}

export function normalizeIsoDate(value: string): string {
  return String(value).slice(0, 10);
}

export function findActiveHoliday(iso: string, holidays: PublicHoliday[]): PublicHoliday | undefined {
  const day = normalizeIsoDate(iso);
  return holidays.find((h) => h.status === "active" && normalizeIsoDate(h.date) === day);
}

export function isScheduledNonWorkingDate(iso: string, nonWorkingDates: string[]): boolean {
  return nonWorkingDates.includes(iso);
}

export function formatTimingRange(startTime: string, endTime: string): string {
  return formatTimeRange12Hour(startTime, endTime);
}

export {
  findDateShiftOverrideForScope,
  getDateShiftTimingLabel,
  getDateShiftTimingLines,
} from "./dateShiftTiming.utils";

const ORDINAL = ["", "1st", "2nd", "3rd", "4th", "5th"] as const;

export function listSaturdaysInMonth(
  year: number,
  monthIndex: number
): { nth: number; iso: string; label: string }[] {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const items: { nth: number; iso: string; label: string }[] = [];
  let nth = 0;

  for (let day = 1; day <= daysInMonth; day += 1) {
    if (new Date(year, monthIndex, day).getDay() !== 6) continue;
    nth += 1;
    const iso = toIsoDate(year, monthIndex, day);
    const ord = ORDINAL[nth] ?? `${nth}th`;
    items.push({ nth, iso, label: `${ord} Saturday (${iso})` });
  }

  return items;
}

export function saturdayOffHolidayName(nth: number, iso: string): string {
  const ord = ORDINAL[nth] ?? `${nth}th`;
  return `Off — ${ord} Saturday (${iso})`;
}

function teacherIdsForDate(
  iso: string,
  weekday: WorkingDayKey,
  kind: WorkingDayCellKind,
  extras: ExtraWorkingTeacher[]
): string[] {
  const ids = extras
    .filter((item) => {
      if (item.day !== weekday) return false;
      if (item.date) return item.date === iso;
      return kind === "holiday" || kind === "weekend";
    })
    .map((item) => item.teacherId);
  return [...new Set(ids)];
}

function resolveCell(
  iso: string,
  year: number,
  monthIndex: number,
  workingDays: WorkingDaysConfig,
  holidays: PublicHoliday[],
  nonWorkingDates: string[],
  extras: ExtraWorkingTeacher[],
  teacherName: (id: string) => string,
  dateShiftOverrides: DateShiftOverride[]
): WorkingDayPreviewCell {
  const d = new Date(`${iso}T00:00:00`);
  const inMonth = d.getFullYear() === year && d.getMonth() === monthIndex;
  const day = d.getDate();
  const weekday = WEEKDAY_KEYS[d.getDay()];

  if (!inMonth) {
    return {
      iso,
      day,
      inMonth: false,
      kind: "weekend",
      statusLabel: "",
      extraTeacherNames: [],
      shiftTimingLines: [],
    };
  }

  const holiday = findActiveHoliday(iso, holidays);
  const scheduledOff = isScheduledNonWorkingDate(iso, nonWorkingDates);

  let kind: WorkingDayCellKind;
  let statusLabel: string;

  if (holiday) {
    kind = "holiday";
    statusLabel = holiday.name.trim() || "Holiday";
  } else if (scheduledOff || !workingDays[weekday]) {
    kind = "weekend";
    statusLabel = scheduledOff && workingDays[weekday] ? "Off" : "Weekend";
  } else {
    kind = "working";
    statusLabel = "Working Day";
  }

  const extraIds = teacherIdsForDate(iso, weekday, kind, extras);
  const extraTeacherNames = extraIds.map(teacherName).filter(Boolean);
  const shiftTimingLines = getDateShiftTimingLines(iso, dateShiftOverrides, teacherName);

  return {
    iso,
    day,
    inMonth: true,
    kind,
    statusLabel,
    extraTeacherNames,
    shiftTimingLines,
  };
}

export function buildWorkingDaysPreviewGrid(
  year: number,
  monthIndex: number,
  workingDays: WorkingDaysConfig,
  holidays: PublicHoliday[],
  nonWorkingDates: string[],
  extras: ExtraWorkingTeacher[],
  teacherName: (id: string) => string,
  dateShiftOverrides: DateShiftOverride[]
): WorkingDayPreviewCell[] {
  const firstDay = new Date(year, monthIndex, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    const dayNumber = index - startOffset + 1;
    const cellDate = new Date(year, monthIndex, dayNumber);
    const iso = toIsoDate(cellDate.getFullYear(), cellDate.getMonth(), cellDate.getDate());
    return resolveCell(
      iso,
      year,
      monthIndex,
      workingDays,
      holidays,
      nonWorkingDates,
      extras,
      teacherName,
      dateShiftOverrides
    );
  });
}
