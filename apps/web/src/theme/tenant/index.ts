/**
 * Phase 10 — Multi-Tenant Theme Engine
 * Public API: config types, token overrides, theme generator, branding context.
 */

export type {
  TenantThemeConfig,
  TenantColorRole,
  TenantTypographyOverrides,
  TenantAccentColors,
} from "./types";
export { getTokenOverridesFromTenantConfig } from "./tenantTokenOverrides";
export { createTenantTheme, createTenantThemeFromTokenOverrides } from "./tenantThemeGenerator";
export {
  TenantBrandingProvider,
  useTenantBranding,
} from "./TenantBrandingContext";
export type { TenantBranding } from "./TenantBrandingContext";
