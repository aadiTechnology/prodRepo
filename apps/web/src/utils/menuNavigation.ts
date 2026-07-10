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

/** True when the user has Campus Buddy (Basic) or AI Advanced (LLM) in Permission Mapping. */
export function hasAiAssistantAccess(
  grantedMenuPaths: Set<string>,
  menus: MenuNode[] = []
): boolean {
  if (
    grantedMenuPaths.has("/ai/basic") ||
    grantedMenuPaths.has("/ai/advanced")
  ) {
    return true;
  }
  const walk = (nodes: MenuNode[]): boolean =>
    nodes.some((node) => {
      const name = (node.name || "").toLowerCase();
      if (node.level === 1 && name.includes("ai assistant")) {
        return true;
      }
      return node.children?.length ? walk(node.children) : false;
    });
  return walk(menus);
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
