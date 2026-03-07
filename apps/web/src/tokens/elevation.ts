/**
 * Design Tokens — Elevation / Shadows
 * Shadow levels for cards, dialogs, menus, and overlays.
 * Values are CSS box-shadow strings.
 */

export const elevationTokens = {
  0: "none",
  1: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  2: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)",
  3: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
  4: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
  5: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
  6: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
} as const;

/** Semantic elevation for common UI elements */
export const elevationSemantic = {
  card: elevationTokens[1],
  cardHover: elevationTokens[2],
  dropdown: elevationTokens[3],
  dialog: elevationTokens[5],
  menu: elevationTokens[3],
  popover: elevationTokens[4],
  tooltip: elevationTokens[2],
} as const;

export type ElevationTokens = typeof elevationTokens;
export type ElevationSemantic = typeof elevationSemantic;
