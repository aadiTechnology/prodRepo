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

export const LEAD_MANAGEMENT_MENU_PATH = "/admissions/leads";
export const STUDENT_MANAGEMENT_MENU_PATH = "/students";

type SidebarChildItem = {
  id: string;
  label: string;
  path: string;
  badgeCount?: number;
};

/** True when the current location matches a sidebar menu path, including optional query params. */
export function isMenuPathActive(
  pathname: string,
  search: string,
  menuPath: string | null | undefined
): boolean {
  const normalized = normalizeMenuPath(menuPath);
  if (!normalized) return false;
  const [path, query] = normalized.split("?");
  if (path === "/") return pathname === "/";
  if (pathname !== path && !pathname.startsWith(`${path}/`)) return false;
  if (!query) return true;
  const expected = new URLSearchParams(query);
  const actual = new URLSearchParams(search);
  for (const [key, value] of expected.entries()) {
    if (actual.get(key) !== value) return false;
  }
  return true;
}

/**
 * Keep Admissions sidebar as Lead Management + Student Management using existing routes.
 * Students is shown under Admissions (not duplicated under Administration).
 * Does not change RBAC grants; only the displayed sidebar children.
 */
export function applyAdmissionsSidebarStructure<
  T extends { id: string; label: string; children?: SidebarChildItem[] },
>(item: T): T {
  const moduleLabel = item.label.trim().toLowerCase();
  const pathnameOf = (path: string) => (normalizeMenuPath(path) || "").split("?")[0];
  const isStudentListChild = (child: SidebarChildItem) => {
    const label = child.label.trim().toLowerCase();
    const path = pathnameOf(child.path);
    return (
      path === "/students" ||
      path === "/admissions/enrollment" ||
      label === "students" ||
      label === "enrollment" ||
      label === "student creation" ||
      label === "student management"
    );
  };

  if (moduleLabel === "administration") {
    const children = (item.children ?? []).filter((child) => !isStudentListChild(child));
    return { ...item, children: children.length > 0 ? children : undefined };
  }

  if (moduleLabel !== "admissions") return item;

  const children = item.children ?? [];
  const isLeadChild = (child: SidebarChildItem) => {
    const label = child.label.trim().toLowerCase();
    return pathnameOf(child.path) === "/admissions/leads" || label === "lead management";
  };

  const existingLead = children.find(isLeadChild);
  const existingStudent = children.find(isStudentListChild);
  const otherChildren = children.filter((child) => !isLeadChild(child) && !isStudentListChild(child));

  return {
    ...item,
    children: [
      {
        id: existingLead?.id ?? `${item.id}-lead-management`,
        label: "Lead Management",
        path: LEAD_MANAGEMENT_MENU_PATH,
        ...(existingLead?.badgeCount != null ? { badgeCount: existingLead.badgeCount } : {}),
      },
      {
        id: existingStudent?.id ?? `${item.id}-student-management`,
        label: "Student Management",
        path: STUDENT_MANAGEMENT_MENU_PATH,
        ...(existingStudent?.badgeCount != null ? { badgeCount: existingStudent.badgeCount } : {}),
      },
      ...otherChildren,
    ],
  };
}

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
