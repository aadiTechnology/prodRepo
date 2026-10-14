import type { DateShiftOverride, OfficeTiming } from "./attendanceConfiguration.types";
import { formatTime12Hour, formatTimeRange12Hour } from "../../../utils/formatters";

function formatTimingRangeForCalendar(startTime: string, endTime: string): string {
  return `${formatTime12Hour(startTime)} to ${formatTime12Hour(endTime)}`;
}

export function dateShiftOverrideKey(date: string, teacherId?: string | null): string {
  return `${date}|${teacherId ?? ""}`;
}

function sameTeacherId(a?: string | null, b?: string | null): boolean {
  if (a == null || a === "" || b == null || b === "") return false;
  return String(a) === String(b);
}

export function findDateShiftOverrideForScope(
  date: string,
  overrides: DateShiftOverride[],
  teacherId?: string | null
): DateShiftOverride | undefined {
  const day = date.slice(0, 10);
  if (teacherId) {
    const forTeacher = overrides.find(
      (item) => item.date.slice(0, 10) === day && sameTeacherId(item.teacherId, teacherId)
    );
    if (forTeacher) return forTeacher;
  }
  return overrides.find(
    (item) => item.date.slice(0, 10) === day && isAllTeachersDateShift(item)
  );
}

export function resolveOfficeTimingForDate(
  officeTiming: OfficeTiming,
  overrides: DateShiftOverride[],
  date: string,
  teacherId?: string | null
): OfficeTiming {
  const override = findDateShiftOverrideForScope(date, overrides, teacherId);
  if (!override) return officeTiming;
  return {
    ...officeTiming,
    startTime: override.startTime,
    endTime: override.endTime,
  };
}

export function getDateShiftTimingLines(
  date: string,
  overrides: DateShiftOverride[],
  teacherName: (id: string) => string
): string[] {
  const day = date.slice(0, 10);
  const forDate = overrides.filter((item) => item.date.slice(0, 10) === day);
  if (forDate.length === 0) return [];

  const lines: string[] = [];
  const allEntry = forDate.find((item) => isAllTeachersDateShift(item));
  if (allEntry) {
    lines.push(
      `All - ${formatTimingRangeForCalendar(allEntry.startTime, allEntry.endTime)}`
    );
  }

  const teacherEntries = forDate.filter((item) => !isAllTeachersDateShift(item));
  const namesByRange = new Map<string, string[]>();
  for (const item of teacherEntries) {
    const rangeKey = `${item.startTime}|${item.endTime}`;
    const name =
      teacherName(String(item.teacherId)).trim() || `Teacher ${item.teacherId}`;
    const existing = namesByRange.get(rangeKey) ?? [];
    existing.push(name);
    namesByRange.set(rangeKey, existing);
  }

  for (const [rangeKey, names] of namesByRange) {
    const [startTime, endTime] = rangeKey.split("|");
    const label = names.join(", ");
    lines.push(`${label} - ${formatTimingRangeForCalendar(startTime, endTime)}`);
  }

  return lines;
}

export function getDateShiftTimingLabel(
  date: string,
  overrides: DateShiftOverride[],
  teacherName?: (id: string) => string
): string {
  const lines = getDateShiftTimingLines(date, overrides, teacherName ?? (() => ""));
  if (lines.length === 0) return "";
  if (lines.length === 1) return lines[0];
  return "Custom";
}

export function isAllTeachersDateShift(entry: DateShiftOverride): boolean {
  return entry.teacherId == null || String(entry.teacherId).trim() === "";
}

export function listDateShiftOverridesForDay(
  date: string,
  overrides: DateShiftOverride[]
): DateShiftOverride[] {
  const day = date.slice(0, 10);
  return overrides.filter((item) => item.date.slice(0, 10) === day);
}

export function buildDateShiftEntriesForSave(
  iso: string,
  scopeIds: string[],
  startTime: string,
  endTime: string,
  allScopeToken: string
): DateShiftOverride[] {
  const teachersOnly = scopeIds.filter((id) => id !== allScopeToken);
  if (teachersOnly.length > 0) {
    return teachersOnly.map((teacherId) => ({
      date: iso,
      startTime,
      endTime,
      teacherId: String(teacherId),
    }));
  }
  return [{ date: iso, startTime, endTime }];
}

export function replaceDateShiftOverridesForDay(
  overrides: DateShiftOverride[],
  date: string,
  entries: DateShiftOverride[]
): DateShiftOverride[] {
  const day = date.slice(0, 10);
  const rest = overrides.filter((item) => item.date.slice(0, 10) !== day);
  const normalized = entries.map((entry) => {
    const tid =
      entry.teacherId != null && String(entry.teacherId).trim() !== ""
        ? String(entry.teacherId)
        : undefined;
    return {
      ...entry,
      date: day,
      ...(tid ? { teacherId: tid } : {}),
    };
  });
  return [...rest, ...normalized];
}

export function upsertDateShiftOverride(
  overrides: DateShiftOverride[],
  next: DateShiftOverride | null,
  scope: { date: string; teacherId?: string | null }
): DateShiftOverride[] {
  const day = scope.date.slice(0, 10);
  const teacherId = scope.teacherId ?? null;
  const rest = overrides.filter((item) => {
    if (item.date.slice(0, 10) !== day) return true;
    const itemAll = item.teacherId == null || item.teacherId === "";
    const scopeAll = teacherId == null || teacherId === "";
    if (scopeAll && itemAll) return false;
    if (!scopeAll && !itemAll && sameTeacherId(item.teacherId, teacherId)) return false;
    return true;
  });
  if (!next) return rest;
  return [...rest, { ...next, date: day, teacherId }];
}
