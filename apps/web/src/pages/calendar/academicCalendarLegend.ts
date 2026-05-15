import { alpha } from "@mui/material/styles";

export type CalendarLegendCategory = "holiday" | "exam" | "event";

export type CalendarLegendStyle = {
  key: CalendarLegendCategory;
  label: string;
  main: string;
  light: string;
};

export const CALENDAR_LEGEND_ITEMS: readonly CalendarLegendStyle[] = [
  {
    key: "holiday",
    label: "Holiday",
    main: "#9B2335",
    light: alpha("#9B2335", 0.12),
  },
  {
    key: "exam",
    label: "Exam",
    main: "#2E7D32",
    light: alpha("#2E7D32", 0.12),
  },
  {
    key: "event",
    label: "Event",
    main: "#1565C0",
    light: alpha("#1565C0", 0.12),
  },
] as const;

const LEGEND_BY_KEY: Record<CalendarLegendCategory, CalendarLegendStyle> = {
  holiday: CALENDAR_LEGEND_ITEMS[0],
  exam: CALENDAR_LEGEND_ITEMS[1],
  event: CALENDAR_LEGEND_ITEMS[2],
};

function normalizeTypeToken(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "_");
}

const LEGACY_HOLIDAY_DB_TYPES = new Set(["PUBLIC_HOLIDAY", "ACADEMIC_BREAK"]);

function resolveSingleCalendarLegendCategory(holidayType: string): CalendarLegendCategory {
  const token = holidayType.trim();
  if (!token) return "holiday";

  const u = normalizeTypeToken(token);
  const lower = token.toLowerCase();

  if (u.includes("EXAM") || lower.includes("exam")) return "exam";
  if (u.includes("EVENT") || lower.includes("event")) return "event";
  if (u === "NON_TEACHING_DAY") return "event";
  if (
    LEGACY_HOLIDAY_DB_TYPES.has(u) ||
    u.includes("HOLIDAY") ||
    u.includes("BREAK") ||
    lower.includes("holiday") ||
    lower.includes("break")
  ) {
    return "holiday";
  }
  if (
    lower.includes("meeting") ||
    lower.includes("parents") ||
    lower.includes("assembly") ||
    lower.includes("function") ||
    lower.includes("ceremony")
  ) {
    return "event";
  }

  // Custom labels are stored on NON_TEACHING_DAY in DB (e.g. "parents meeting", "Sports day").
  return "event";
}

function nameSuggestsEvent(holidayName: string | undefined | null): boolean {
  const lower = (holidayName ?? "").toLowerCase();
  if (!lower) return false;
  return (
    lower.includes("meeting") ||
    lower.includes("parents") ||
    lower.includes("assembly") ||
    lower.includes("function") ||
    lower.includes("ceremony")
  );
}

/** Maps API `holiday_type` (legacy enum or free-text label) to a legend category. */
export function resolveCalendarLegendCategory(
  holidayType: string | undefined | null,
  holidayName?: string | undefined | null
): CalendarLegendCategory {
  const raw = (holidayType ?? "").trim();
  if (!raw) return nameSuggestsEvent(holidayName) ? "event" : "holiday";

  const tokens = raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const categories = (tokens.length > 0 ? tokens : [raw]).map(resolveSingleCalendarLegendCategory);

  if (categories.includes("exam")) return "exam";
  if (categories.includes("event")) return "event";
  if (categories.includes("holiday") && nameSuggestsEvent(holidayName)) return "event";
  return "holiday";
}

export function getCalendarLegendStyle(
  holidayType: string | undefined | null,
  holidayName?: string | undefined | null
): CalendarLegendStyle {
  return LEGEND_BY_KEY[resolveCalendarLegendCategory(holidayType, holidayName)];
}

export function getCalendarLegendDisplayLabel(
  holidayType: string | undefined | null,
  holidayName?: string | undefined | null
): string {
  return getCalendarLegendStyle(holidayType, holidayName).label;
}
