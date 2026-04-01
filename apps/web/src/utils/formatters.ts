/**
 * Shared display formatters for tables, filters, and labels.
 */

const DEFAULT_LOCALE = "en-US";

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
