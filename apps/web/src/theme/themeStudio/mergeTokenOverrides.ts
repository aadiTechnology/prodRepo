/**
 * Theme Studio — Merge partial token overrides with default tokens.
 * Produces a full Tokens object for createAppTheme so theme builds correctly.
 */

import { tokens } from "../../tokens";
import type { Tokens } from "../../tokens";
import type { ColorTokens } from "../../tokens";
import type { TypographyTokens } from "../../tokens";

function mergeNestedObjects(
  base: Record<string, unknown>,
  override: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...base };
  for (const key of Object.keys(override)) {
    const baseVal = result[key];
    const overrideVal = override[key];
    if (overrideVal === undefined) continue;
    if (
      typeof baseVal === "object" &&
      baseVal !== null &&
      !Array.isArray(baseVal) &&
      typeof overrideVal === "object" &&
      overrideVal !== null &&
      !Array.isArray(overrideVal)
    ) {
      result[key] = {
        ...(baseVal as Record<string, unknown>),
        ...(overrideVal as Record<string, unknown>),
      };
    } else {
      result[key] = overrideVal;
    }
  }
  return result;
}

/**
 * Merges default tokens with partial overrides (nested merge for colors and typography).
 * Use the result with createAppTheme(merged) for Theme Studio preview.
 */
export function mergeTokenOverrides(overrides: Partial<Tokens>): Tokens {
  const base = tokens;
  if (!overrides || Object.keys(overrides).length === 0) return base;

  const colors: ColorTokens =
    overrides.colors != null
      ? mergeNestedObjects(
          base.colors as unknown as Record<string, unknown>,
          overrides.colors as unknown as Record<string, unknown>
        ) as ColorTokens
      : base.colors;

  const spacing =
    overrides.spacing != null
      ? {
          ...base.spacing,
          ...overrides.spacing,
          tokens: { ...base.spacing.tokens, ...(overrides.spacing.tokens ?? {}) },
        }
      : base.spacing;

  const typography: TypographyTokens =
    overrides.typography != null
      ? mergeNestedObjects(
          base.typography as unknown as Record<string, unknown>,
          overrides.typography as unknown as Record<string, unknown>
        ) as TypographyTokens
      : base.typography;

  const radius =
    overrides.radius != null
      ? {
          tokens: { ...base.radius.tokens, ...(overrides.radius.tokens ?? {}) },
          semantic: { ...base.radius.semantic, ...(overrides.radius.semantic ?? {}) },
        }
      : base.radius;

  const elevation =
    overrides.elevation != null
      ? {
          tokens: { ...base.elevation.tokens, ...(overrides.elevation.tokens ?? {}) },
          semantic: { ...base.elevation.semantic, ...(overrides.elevation.semantic ?? {}) },
        }
      : base.elevation;

  const breakpoints =
    overrides.breakpoints != null
      ? { ...base.breakpoints, ...overrides.breakpoints }
      : base.breakpoints;

  return {
    colors,
    spacing,
    typography,
    radius,
    elevation,
    breakpoints,
  };
}
