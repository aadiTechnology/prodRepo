/**
 * RBAC Types
 */

import { MenuNode } from "./menu";
import { User } from "./auth";

export interface RBACState {
  roles: string[];
  permissions: string[];
  menus: MenuNode[];
  isLoading: boolean;
  error: string | null;
}

export interface LoginContextResponse {
  access_token: string;
  token_type: string;
  user: User;
  roles: string[];
  menus: MenuNode[];
}
