/**
 * Design Tokens — Spacing System
 * Consistent spacing scale for layouts, components, and dashboards.
 * Base unit: 4px. Scale is used as multiplier (e.g. spacing(2) => 8px when base is 4).
 */

/** Base unit in pixels. Theme spacing multiplier typically uses this (e.g. 8). */
export const spacingBase = 4;

/**
 * Spacing scale in pixels.
 * Use for fixed values; for theme-driven spacing use spacing() with scale index.
 */
export const spacingScale = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
} as const;

/** Named spacing tokens for common use cases */
export const spacingTokens = {
  /** Component internal padding (e.g. button, chip) */
  xs: spacingScale[1],
  sm: spacingScale[2],
  md: spacingScale[3],
  lg: spacingScale[4],
  xl: spacingScale[6],

  /** Section / layout spacing */
  sectionX: spacingScale[4],
  sectionY: spacingScale[6],
  pageX: spacingScale[6],
  pageY: spacingScale[8],

  /** Gaps */
  gapXs: spacingScale[1],
  gapSm: spacingScale[2],
  gapMd: spacingScale[4],
  gapLg: spacingScale[6],
  gapXl: spacingScale[8],
} as const;

export type SpacingScale = typeof spacingScale;
export type SpacingTokens = typeof spacingTokens;
