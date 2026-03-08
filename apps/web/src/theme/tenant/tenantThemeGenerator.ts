/**
 * Phase 10 — Multi-Tenant Theme Engine
 * Tenant Theme Generator: accepts tenant configuration, merges with default tokens, produces MUI theme.
 * Flow: Tenant Config → Token Overrides → createAppTheme(merged) → Material UI Theme
 */

import type { Theme } from "@mui/material/styles";
import { createAppTheme } from "../build";
import { getTokenOverridesFromTenantConfig } from "./tenantTokenOverrides";
import type { TenantThemeConfig } from "./types";

/**
 * Generates a Material UI theme for the given tenant configuration.
 * - If config is undefined or empty, returns the default application theme.
 * - Otherwise merges tenant overrides with default design tokens and builds the theme.
 * Components are unchanged; all branding flows through tokens and theme.
 */
export function createTenantTheme(config?: TenantThemeConfig | null): Theme {
  if (!config || !hasAnyOverrides(config)) {
    return createAppTheme();
  }

  const tokenOverrides = getTokenOverridesFromTenantConfig(config);
  return createAppTheme(tokenOverrides);
}

function hasAnyOverrides(config: TenantThemeConfig): boolean {
  return (
    config.primary != null ||
    config.secondary != null ||
    (config.typography != null && Object.keys(config.typography).length > 0) ||
    (config.accentColors != null &&
      Object.keys(config.accentColors).length > 0)
  );
}
