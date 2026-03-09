/**
 * Theme Studio — Build tenant theme configuration from token overrides for export.
 * Output is compatible with TenantThemeConfig and can be used with createTenantTheme.
 */

import type { TenantThemeConfig } from "../tenant/types";
import type { Tokens } from "../../tokens";
import { tokens } from "../../tokens";
import { mergeTokenOverrides } from "./mergeTokenOverrides";

export interface ThemeStudioExportConfig extends TenantThemeConfig {
  /** Optional component radius (for reference; not yet in TenantThemeConfig). */
  componentRadius?: number;
}

/**
 * Builds a tenant theme configuration object from current token overrides.
 * Suitable for JSON download and for use with createTenantTheme (primary, secondary, typography, accentColors).
 */
export function buildExportConfig(overrides: Partial<Tokens>): ThemeStudioExportConfig {
  const merged = mergeTokenOverrides(overrides);
  const config: ThemeStudioExportConfig = {};

  if (merged.colors) {
    config.primary = {
      main: merged.colors.primary.main,
      light: merged.colors.primary.light,
      dark: merged.colors.primary.dark,
      contrast: merged.colors.primary.contrast,
    };
    config.secondary = {
      main: merged.colors.secondary.main,
      light: merged.colors.secondary.light,
      dark: merged.colors.secondary.dark,
      contrast: merged.colors.secondary.contrast,
    };
    if (merged.colors.semantic) {
      config.accentColors = {
        active: merged.colors.semantic.active,
        inactive: merged.colors.semantic.inactive,
        pending: merged.colors.semantic.pending,
        draft: merged.colors.semantic.draft,
        archived: merged.colors.semantic.archived,
      };
    }
  }

  if (merged.typography) {
    config.typography = {
      fontFamilyPrimary: merged.typography.fontFamily.primary,
      fontFamilySecondary: merged.typography.fontFamily.secondary,
      fontSizeBase: merged.typography.fontSize.base,
      fontWeightMedium: merged.typography.fontWeight.medium,
      fontWeightBold: merged.typography.fontWeight.bold,
    };
  }

  if (merged.radius?.semantic?.input != null) {
    config.componentRadius = merged.radius.semantic.input;
  } else if (merged.radius?.tokens) {
    config.componentRadius = (merged.radius.tokens as Record<string, number>).md ?? tokens.radius.tokens.md;
  }

  return config;
}

/**
 * Triggers download of the export config as a JSON file.
 */
export function downloadThemeConfig(config: ThemeStudioExportConfig, filename = "tenant-theme-config.json"): void {
  const json = JSON.stringify(config, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
