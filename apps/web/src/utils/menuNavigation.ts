/**
 * Shared helpers for RBAC menu path normalization and navigation.
 */

import type { MenuNode } from "../types/menu";

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

/** Permission-only paths for Campus Buddy; not sidebar routes. */
export const AI_ASSISTANT_MENU_PATHS = new Set(["/ai/basic", "/ai/advanced"]);

/** Level-1 module hidden from sidebar; access is via floating Campus Buddy icon only. */
export const SIDEBAR_HIDDEN_MODULE_NAMES = new Set(["AI Assistant"]);

/** True when Permission Mapping granted Campus Buddy (Basic) and/or AI Advanced (LLM). */
export function hasAiAssistantAccess(grantedMenuPaths: Set<string>): boolean {
  for (const path of AI_ASSISTANT_MENU_PATHS) {
    if (grantedMenuPaths.has(path)) return true;
  }
  return false;
}

/** True when a level-1 menu module must not render in the main sidebar. */
export function isSidebarHiddenModule(name: string): boolean {
  return SIDEBAR_HIDDEN_MODULE_NAMES.has(name);
}

/** True when path is a permission-only AI entitlement row (not a real screen). */
export function isAiAssistantPermissionPath(path: string | null | undefined): boolean {
  const normalized = normalizeMenuPath(path);
  if (!normalized) return false;
  return AI_ASSISTANT_MENU_PATHS.has(normalized);
}

export const STAFF_ATTENDANCE_MENU_PATH = "/attendance/teacher-marking";
export const STAFF_ATTENDANCE_MENU_LABEL = "Staff Attendance";

/** Display label for sidebar / RBAC menu entries (path and legacy name overrides). */
export function resolveSidebarMenuLabel(
  path: string | null | undefined,
  name: string
): string {
  const normalized = normalizeMenuPath(path);
  if (normalized === STAFF_ATTENDANCE_MENU_PATH) {
    return STAFF_ATTENDANCE_MENU_LABEL;
  }
  if (name === "Teacher Attendance") {
    return STAFF_ATTENDANCE_MENU_LABEL;
  }
  return name;
}

/** True when the user has sidebar access to this route (exact or child path). */
export function hasGrantedMenuAccess(pathname: string, grantedMenuPaths: Set<string>): boolean {
  if (grantedMenuPaths.has(pathname)) return true;
  for (const menuPath of grantedMenuPaths) {
    if (menuPath !== "/" && pathname.startsWith(`${menuPath}/`)) {
      return true;
    }
  }
  return false;
}
