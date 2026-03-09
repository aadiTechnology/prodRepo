/**
 * Phase 10 — Multi-Tenant Theme Engine
 * Tenant Theme Generator: accepts tenant configuration or template token overrides, produces MUI theme.
 * Flow: Tenant Config | Template Token Overrides → createAppTheme(merged) → Material UI Theme
 */

import type { Theme } from "@mui/material/styles";
import { createAppTheme } from "../themeBuilder";
import { mergeTokenOverrides } from "../themeStudio/mergeTokenOverrides";
import { getTokenOverridesFromTenantConfig } from "./tenantTokenOverrides";
import type { TenantThemeConfig } from "./types";
import type { Tokens } from "../../tokens";

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

/**
 * Generates a Material UI theme from template token overrides (e.g. from Theme Template assigned to tenant).
 * Merges overrides with default tokens so the theme is complete; use when tenant.theme_config is present.
 */
export function createTenantThemeFromTokenOverrides(
  tokenOverrides?: Partial<Tokens> | Record<string, unknown> | null
): Theme {
  if (!tokenOverrides || Object.keys(tokenOverrides).length === 0) {
    return createAppTheme();
  }
  const merged = mergeTokenOverrides(tokenOverrides as Partial<Tokens>);
  return createAppTheme(merged);
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
