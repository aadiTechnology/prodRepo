/**
 * Menu Types
 * Based on LOGIN_API_RESPONSE_CONTRACT.md
 */

export interface Feature {
  code: string;
  name: string;
  category: string | null;
}

export interface MenuNode {
  id: number;
  name: string;
  path: string | null;
  icon: string | null;
  sort_order: number;
  level: 1 | 2;
  features: Feature[];
  children?: MenuNode[]; // Only for level 1 menus
}
