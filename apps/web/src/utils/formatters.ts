/**
 * Shared display formatters for tables, filters, and labels.
 */

const DEFAULT_LOCALE = "en-US";

/** Human-readable label from a role code (e.g. `school_admin` → `School Admin`). */
export function toRoleLabel(role: string | null | undefined): string {
  if (!role) return "Unknown";
  return role.replace(/_/g, " ").replace(/\b\w/g, (letter: string) => letter.toUpperCase());
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
