/**
 * Phase 10 — Multi-Tenant Theme Engine
 * Maps tenant configuration to design token overrides.
 * Flow: Tenant Config → Token Overrides → Theme Generation (no component changes).
 */

import { tokens } from "../../tokens";
import type { Tokens } from "../../tokens";
import type { ColorTokens } from "../../tokens";
import type { TypographyTokens } from "../../tokens";
import type {
  TenantThemeConfig,
  TenantColorRole,
  TenantTypographyOverrides,
  TenantAccentColors,
} from "./types";

function tenantColorToTokenRole(role: TenantColorRole): ColorTokens["primary"] {
  return {
    main: role.main,
    light: role.light ?? role.main,
    dark: role.dark ?? role.main,
    contrast: role.contrast ?? "#ffffff",
  };
}

function mergeColors(
  base: ColorTokens,
  config: TenantThemeConfig
): ColorTokens {
  let next = { ...base };

  if (config.primary) {
    next = {
      ...next,
      primary: tenantColorToTokenRole(config.primary),
    };
  }
  if (config.secondary) {
    next = {
      ...next,
      secondary: tenantColorToTokenRole(config.secondary),
    };
  }
  if (config.accentColors && Object.keys(config.accentColors).length > 0) {
    const accent = config.accentColors as TenantAccentColors;
    next = {
      ...next,
      semantic: {
        ...next.semantic,
        ...(accent.active != null && { active: accent.active }),
        ...(accent.inactive != null && { inactive: accent.inactive }),
        ...(accent.pending != null && { pending: accent.pending }),
        ...(accent.draft != null && { draft: accent.draft }),
        ...(accent.archived != null && { archived: accent.archived }),
      },
    };
  }

  return next;
}

function mergeTypography(
  base: TypographyTokens,
  config: TenantThemeConfig
): TypographyTokens {
  const overrides = config.typography;
  if (!overrides) return base;

  const fontFamily = { ...base.fontFamily };
  if (overrides.fontFamilyPrimary != null)
    fontFamily.primary = overrides.fontFamilyPrimary;
  if (overrides.fontFamilySecondary != null)
    fontFamily.secondary = overrides.fontFamilySecondary;

  const fontSize = { ...base.fontSize };
  if (overrides.fontSizeBase != null) fontSize.base = overrides.fontSizeBase;

  const fontWeight = { ...base.fontWeight };
  if (overrides.fontWeightMedium != null)
    fontWeight.medium = overrides.fontWeightMedium;
  if (overrides.fontWeightBold != null) fontWeight.bold = overrides.fontWeightBold;

  return {
    ...base,
    fontFamily,
    fontSize,
    fontWeight,
  };
}

/**
 * Converts tenant theme configuration into token overrides.
 * Returns only the branches that need to override defaults (colors, typography).
 * Used by the tenant theme generator to merge with default tokens.
 */
export function getTokenOverridesFromTenantConfig(
  config: TenantThemeConfig
): Partial<Tokens> {
  const hasColorOverrides =
    config.primary != null ||
    config.secondary != null ||
    (config.accentColors != null &&
      Object.keys(config.accentColors).length > 0);
  const hasTypographyOverrides =
    config.typography != null &&
    Object.keys(config.typography).length > 0;

  const overrides: Partial<Tokens> = {};

  if (hasColorOverrides) {
    overrides.colors = mergeColors(tokens.colors, config);
  }
  if (hasTypographyOverrides) {
    overrides.typography = mergeTypography(tokens.typography, config);
  }

  return overrides;
}
