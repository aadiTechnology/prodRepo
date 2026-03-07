/**
 * Design Tokens — Border Radius
 * Consistent rounding for components (buttons, cards, inputs, dialogs).
 */

export const radiusTokens = {
  none: 0,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  "2xl": 16,
  "3xl": 24,
  full: 9999,
} as const;

/** Semantic radius aliases for common components */
export const radiusSemantic = {
  button: radiusTokens.md,
  input: radiusTokens.lg,
  card: radiusTokens.xl,
  dialog: radiusTokens.xl,
  chip: radiusTokens.lg,
  menu: radiusTokens.lg,
} as const;

export type RadiusTokens = typeof radiusTokens;
export type RadiusSemantic = typeof radiusSemantic;
