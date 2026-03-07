/**
 * Design Tokens — Responsive Breakpoints
 * Pixel values for responsive UI. Compatible with MUI breakpoints.
 */

export const breakpointTokens = {
  xs: 0,
  sm: 600,
  md: 960,
  lg: 1280,
  xl: 1920,
} as const;

/** Media query min-width values (for use in JS or CSS) */
export const breakpointMin = {
  sm: `${breakpointTokens.sm}px`,
  md: `${breakpointTokens.md}px`,
  lg: `${breakpointTokens.lg}px`,
  xl: `${breakpointTokens.xl}px`,
} as const;

/** Media query max-width values (e.g. max-width: 599px for "below sm") */
export const breakpointMax = {
  xs: `${breakpointTokens.sm - 1}px`,
  sm: `${breakpointTokens.md - 1}px`,
  md: `${breakpointTokens.lg - 1}px`,
  lg: `${breakpointTokens.xl - 1}px`,
} as const;

export type BreakpointTokens = typeof breakpointTokens;
