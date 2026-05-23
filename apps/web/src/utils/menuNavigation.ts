/**
 * Shared helpers for RBAC menu path normalization and navigation.
 */

/** Normalize a stored menu path for client-side routing. */
export function normalizeMenuPath(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed === "/") return "/";
  if (trimmed.startsWith("//")) return null;
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

/** True when the path can be used with react-router navigate(). */
export function isValidMenuPath(path: string | null | undefined): path is string {
  return normalizeMenuPath(path) !== null;
}

/** True only when a menu node has one or more child entries. */
export function hasMenuChildren(children?: unknown[] | null): boolean {
  return Array.isArray(children) && children.length > 0;
}
