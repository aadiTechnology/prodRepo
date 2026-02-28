/**
 * Menu Types
 * Based on LOGIN_API_RESPONSE_CONTRACT.md
 */

export interface Feature {
  code: string;
  name: string;
  category: string | null;
}

/** Flat menu item from API (GET /menus, GET /rbac/roles/:id/menus) */
export interface MenuItem {
  id: number;
  name: string;
  path: string | null;
  icon: string | null;
  sort_order: number;
  level: number;
  parent_id: number | null;
  tenant_id: number | null;
  is_active: boolean;
  created_at: string;
}

export interface MenuNode {
  id: number;
  name: string;
  path: string | null;
  icon: string | null;
  sort_order: number;
  level: 1 | 2;
  features?: Feature[];
  children?: MenuNode[]; // Only for level 1 menus
}
