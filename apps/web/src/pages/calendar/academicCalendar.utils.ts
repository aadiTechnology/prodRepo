import dayjs from "dayjs";

import type { AcademicYear } from "../../api/services/academicYearService";
import type { AcademicCalendarDayItem } from "../../services/academicCalendarApi";

export const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export const OUTSIDE_ACADEMIC_YEAR_LABEL = "Outside Academic Year";
export const WEEKEND_LABEL = "Weekend";

export const EMPTY_ACADEMIC_YEARS: AcademicYear[] = [];

export function mergeHolidayDayRows(
  existing: AcademicCalendarDayItem,
  incoming: AcademicCalendarDayItem
): AcademicCalendarDayItem {
  const names = `${existing.holiday_name}, ${incoming.holiday_name}`
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const uniqueNames = [...new Set(names)];
  const types = `${existing.holiday_type}, ${incoming.holiday_type}`
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const uniqueTypes = [...new Set(types)];
  return {
    ...existing,
    holiday_name: uniqueNames.join(", "),
    holiday_type: uniqueTypes.join(", "),
    outside_academic_year: existing.outside_academic_year || incoming.outside_academic_year,
    status: existing.status === "ACTIVE" || incoming.status === "ACTIVE" ? "ACTIVE" : existing.status,
  };
}

export function buildHolidayMap(rows: AcademicCalendarDayItem[]): Map<string, AcademicCalendarDayItem> {
  const map = new Map<string, AcademicCalendarDayItem>();
  for (const row of rows) {
    const prev = map.get(row.date);
    map.set(row.date, prev ? mergeHolidayDayRows(prev, row) : row);
  }
  return map;
}

export function parseISODateOnly(iso: string): dayjs.Dayjs {
  return dayjs(`${iso}T00:00:00`);
}

export function isDateOutsideRange(isoDate: string, start: string, end: string): boolean {
  const d = parseISODateOnly(isoDate);
  const s = parseISODateOnly(start);
  const e = parseISODateOnly(end);
  return d.isBefore(s, "day") || d.isAfter(e, "day");
}

export function isWeekendIso(iso: string): boolean {
  const dow = parseISODateOnly(iso).day();
  return dow === 0 || dow === 6;
}

export type CalendarCell =
  | { kind: "empty"; key: string }
  | {
      kind: "day";
      key: string;
      iso: string;
      dayNum: number;
      holiday?: AcademicCalendarDayItem;
      outsideAcademicYear: boolean;
    };

export function buildMonthCells(year: number, month: number, ay: AcademicYear | null): CalendarCell[] {
  const first = dayjs().year(year).month(month - 1).date(1);
  const pad = first.day();
  const dim = first.daysInMonth();
  const cells: CalendarCell[] = [];

  for (let i = 0; i < pad; i += 1) {
    cells.push({ kind: "empty", key: `pad-${i}` });
  }

  for (let d = 1; d <= dim; d += 1) {
    const iso = dayjs().year(year).month(month - 1).date(d).format("YYYY-MM-DD");
    const outside = ay != null ? isDateOutsideRange(iso, ay.start_date, ay.end_date) : false;
    cells.push({
      kind: "day",
      key: iso,
      iso,
      dayNum: d,
      outsideAcademicYear: outside,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ kind: "empty", key: `trail-${cells.length}` });
  }

  return cells;
}
