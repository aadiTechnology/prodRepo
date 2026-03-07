/**
 * Design Tokens — Typography System
 * Font families, sizes, weights, line heights for enterprise applications.
 */

export const typographyTokens = {
  /** Font families */
  fontFamily: {
    primary: [
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Roboto",
      '"Helvetica Neue"',
      "Arial",
      "sans-serif",
    ].join(", "),
    secondary: [
      "Georgia",
      '"Times New Roman"',
      "Times",
      "serif",
    ].join(", "),
    mono: [
      '"SF Mono"',
      "Monaco",
      '"Cascadia Code"',
      '"Roboto Mono"',
      "Consolas",
      "monospace",
    ].join(", "),
  },

  /** Font sizes in px */
  fontSize: {
    xs: 10,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,
    xl: 20,
    "2xl": 24,
    "3xl": 30,
    "4xl": 36,
    "5xl": 48,
  },

  /** Font weights */
  fontWeight: {
    light: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  /** Line heights (unitless preferred for accessibility) */
  lineHeight: {
    tight: 1.2,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 1.75,
    relaxed2: 2,
  },

  /** Letter spacing */
  letterSpacing: {
    tighter: "-0.05em",
    tight: "-0.025em",
    normal: "0",
    wide: "0.025em",
    wider: "0.05em",
    widest: "0.1em",
  },
} as const;

export type TypographyTokens = typeof typographyTokens;
