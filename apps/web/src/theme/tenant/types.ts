/**
 * Phase 10 — Multi-Tenant Theme Engine
 * Tenant Theme Configuration types.
 * All tenant branding flows through these configs into token overrides; no component-level tenant logic.
 */

/** Single color role as used in design tokens (primary, secondary, etc.) */
export interface TenantColorRole {
  main: string;
  light?: string;
  dark?: string;
  contrast?: string;
}

/** Optional typography overrides; only provided keys override default tokens */
export interface TenantTypographyOverrides {
  fontFamilyPrimary?: string;
  fontFamilySecondary?: string;
  fontSizeBase?: number;
  fontWeightMedium?: number;
  fontWeightBold?: number;
}

/** Optional UI accent colors (e.g. semantic.active, semantic.pending or custom) */
export interface TenantAccentColors {
  active?: string;
  inactive?: string;
  pending?: string;
  draft?: string;
  archived?: string;
  [key: string]: string | undefined;
}

/**
 * Tenant theme configuration.
 * Only these values drive tenant branding; they are merged with default tokens to produce the theme.
 */
export interface TenantThemeConfig {
  /** Primary brand color */
  primary?: TenantColorRole;
  /** Secondary brand color */
  secondary?: TenantColorRole;
  /** Typography overrides (font family, size, weight) */
  typography?: TenantTypographyOverrides;
  /** Logo URL or path for tenant branding (consumed via TenantBrandingContext, not MUI theme) */
  logo?: string;
  /** Optional accent/semantic colors */
  accentColors?: TenantAccentColors;
}
