/**
 * Shared display formatters for tables, filters, and labels.
 */

const DEFAULT_LOCALE = "en-US";
const INDIA_LOCALE = "en-IN";

/**
 * Parse API datetimes stored as naive UTC (SQL Server / FastAPI default).
 * Strings without a timezone are treated as UTC, not local time.
 */
export function parseApiUtcDateTime(value: string | Date | null | undefined): Date {
  if (value == null || value === "") return new Date(NaN);
  if (value instanceof Date) return value;
  const trimmed = value.trim();
  if (!trimmed) return new Date(NaN);
  if (/[zZ]$/.test(trimmed) || /[+-]\d{2}:\d{2}$/.test(trimmed)) {
    return new Date(trimmed);
  }
  const normalized = trimmed.includes("T") ? trimmed : `${trimmed}T00:00:00`;
  return new Date(`${normalized}Z`);
}

/** Date + time in the user's locale (defaults to en-IN for school apps). */
export function formatDateTime(
  value: string | Date | null | undefined,
  options?: { locale?: string; emptyPlaceholder?: string }
): string {
  const empty = options?.emptyPlaceholder ?? "—";
  const d = parseApiUtcDateTime(value);
  if (Number.isNaN(d.getTime())) return empty;
  return d.toLocaleString(options?.locale ?? INDIA_LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Human-readable label from a role code (e.g. `school_admin` → `School Admin`). */
export function toRoleLabel(role: string | null | undefined): string {
  if (!role) return "Unknown";
  return role
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/** Short date for list cells (e.g. `24 Mar 2025`). Returns placeholder when missing. */
export function formatShortDate(
  value: string | Date | null | undefined,
  options?: { locale?: string; emptyPlaceholder?: string }
): string {
  const empty = options?.emptyPlaceholder ?? "-";
  if (value == null || value === "") return empty;
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return empty;
  return d.toLocaleDateString(options?.locale ?? DEFAULT_LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Strip trailing full stops from class/division labels (e.g. "Nursury." → "Nursury"). */
export function formatClassDisplayLabel(name: string | null | undefined): string {
  if (!name) return "";
  return name.replace(/\.$/, "").trim();
}

/** HH:mm (24h) from API/config → locale 12h display (e.g. 17:00 → 5:00 pm). */
export function formatTime12Hour(
  time: string | null | undefined,
  options?: { locale?: string; emptyPlaceholder?: string }
): string {
  const empty = options?.emptyPlaceholder ?? "—";
  if (!time?.trim()) return empty;
  const [hourRaw, minuteRaw] = time.trim().split(":");
  const h = Number(hourRaw);
  const m = Number(minuteRaw);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return empty;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString(options?.locale ?? INDIA_LOCALE, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Display range for office / date shift times (12-hour). */
export function formatTimeRange12Hour(startTime: string, endTime: string, locale?: string): string {
  return `${formatTime12Hour(startTime, { locale })} – ${formatTime12Hour(endTime, { locale })}`;
}

/** Hours / effort values from APIs that may return string decimals. */
export function formatHours(
  value: string | number | null | undefined,
  options?: { emptyPlaceholder?: string; fractionDigits?: number; locale?: string }
): string {
  const empty = options?.emptyPlaceholder ?? "—";
  if (value == null || value === "") return empty;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return empty;
  const digits = options?.fractionDigits ?? 2;
  return n.toLocaleString((options?.locale ?? DEFAULT_LOCALE) as string, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
