/**
 * RBAC Types
 */

import { MenuNode } from "./menu";
import { User, TenantInfo } from "./auth";

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
  permissions: string[];
  menus: MenuNode[];
  tenant?: TenantInfo | null;
  /** Opaque version string from backend; changes when effective RBAC changes. */
  rbac_version?: string | null;
  /** Per-tenant AI plan: basic (no LLM) vs advanced (LLM). */
  ai_assistant?: {
    plan_tier: string;
    ai_enabled: boolean;
    llm_enabled: boolean;
    monthly_llm_unit_cap?: number | null;
  } | null;
}
