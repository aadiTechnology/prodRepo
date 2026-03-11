/**
 * Design Tokens — Color System
 * Single source of truth for all UI colors.
 * Supports semantic roles, grayscale, and future multi-theme/tenant branding.
 */

export const colorTokens = {
  /** Brand & semantic palette — main/light/dark/contrast for each role */
  primary: {
    main: "#1976d2",
    light: "#42a5f5",
    dark: "#1565c0",
    contrast: "#ffffff",
  },
  secondary: {
    main: "#9c27b0",
    light: "#ba68c8",
    dark: "#7b1fa2",
    contrast: "#ffffff",
  },
  success: {
    main: "#2e7d32",
    light: "#4caf50",
    dark: "#1b5e20",
    contrast: "#ffffff",
  },
  warning: {
    main: "#ed6c02",
    light: "#ff9800",
    dark: "#e65100",
    contrast: "#ffffff",
  },
  error: {
    main: "#d32f2f",
    light: "#ef5350",
    dark: "#c62828",
    contrast: "#ffffff",
  },
  info: {
    main: "#0288d1",
    light: "#03a9f4",
    dark: "#01579b",
    contrast: "#ffffff",
  },

  /** Backgrounds — page, surface, elevated */
  background: {
    default: "#f5f6fa",
    paper: "#ffffff",
    subtle: "#f8fafc",
    muted: "#f1f5f9",
  },

  /** Surface — cards, panels, overlays */
  surface: {
    card: "#ffffff",
    elevated: "#ffffff",
    overlay: "rgba(0, 0, 0, 0.5)",
  },

  /** Borders — default, subtle, strong, focus */
  border: {
    default: "#e2e8f0",
    subtle: "#f1f5f9",
    strong: "#cbd5e1",
    focus: "#1976d2",
  },

  /** Text — primary, secondary, disabled, hint, inverse */
  text: {
    primary: "rgba(0, 0, 0, 0.87)",
    secondary: "rgba(0, 0, 0, 0.6)",
    disabled: "rgba(0, 0, 0, 0.38)",
    hint: "rgba(0, 0, 0, 0.38)",
    inverse: "#ffffff",
  },

  /** Divider */
  divider: "rgba(0, 0, 0, 0.12)",

  /** Grayscale scale — for consistent neutrals and future theming */
  gray: {
    0: "#ffffff",
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a",
    950: "#020617",
  },

  /** Semantic UI aliases common in SaaS dashboards */
  semantic: {
    active: "#2e7d32",
    inactive: "#64748b",
    pending: "#ed6c02",
    draft: "#94a3b8",
    rejected: "#d32f2f",
    archived: "#64748b",
  },
} as const;

export type ColorTokens = typeof colorTokens;
