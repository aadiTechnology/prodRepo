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

  /** Semantic UI aliases common in SaaS dashboards */
  semantic: {
    active: "#2e7d32",
    inactive: "#64748b",
    pending: "#ed6c02",
    draft: "#94a3b8",
    rejected: "#d32f2f",
    archived: "#64748b",
  },

  /** PRESCHOOL THEME - Add these new tokens */
  preschool: {
    coral: {
      main: "#FF6B6B",
      light: "#FF8787",
      dark: "#EE5A52",
      contrast: "#ffffff",
    },
    turquoise: {
      main: "#4ECDC4",
      light: "#6FD9D1",
      dark: "#3AB8AF",
      contrast: "#ffffff",
    },
    sunshine: {
      main: "#FFE66D",
      light: "#FFF094",
      dark: "#F5D94C",
      contrast: "#2D3748",
    },
    lavender: {
      main: "#9F7AEA",
      light: "#B794F4",
      dark: "#805AD5",
      contrast: "#ffffff",
    },
    peach: {
      main: "#F6AD55",
      light: "#FBD38D",
      dark: "#ED8936",
      contrast: "#ffffff",
    },
    mint: {
      main: "#48BB78",
      light: "#68D391",
      dark: "#38A169",
      contrast: "#ffffff",
    },
  },

  /** UPDATE BACKGROUNDS - Changed to warm, preschool-friendly colors */
  background: {
    default: "#FFF9F0",        // Warm cream
    paper: "#FFFFFF",
    subtle: "#FFF5E6",         // Lighter warm cream
    muted: "#FFE8CC",          // Peachy cream
  },

  /** SURFACE — cards, panels, overlays */
  surface: {
    card: "#FFFFFF",
    elevated: "#FFFBF5",       // Slight warm tint
    overlay: "rgba(0, 0, 0, 0.5)",
  },

  /** UPDATE BORDERS - Warmer tones */
  border: {
    default: "#F4E4D7",        // Warm beige border
    subtle: "#FAF0E6",         // Very light warm
    strong: "#E8D5C4",         // Stronger warm border
    focus: "#4ECDC4",          // Turquoise focus
  },

  /** SIDEBAR SPECIFIC COLORS */
  sidebar: {
    background: "linear-gradient(180deg, #FFF9F0 0%, #FAFAFA 100%)",
    backgroundSolid: "#FAFAFA",
    hover: "#F7FAFC",
    active: "#FFF9F0",
    border: "#F4E4D7",         // Warm border
    text: {
      primary: "#2D3748",
      secondary: "#718096",
      muted: "#A0AEC0",
    },
  },

  /** MENU ITEM COLORS */
  menuColors: {
    dashboard: "#4ECDC4",      // Turquoise
    students: "#FF6B6B",       // Coral
    academics: "#9F7AEA",      // Lavender
    fees: "#F6AD55",           // Peach
    staff: "#4299E1",          // Blue
    finance: "#48BB78",        // Mint
    settings: "#718096",       // Gray
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
} as const;

export type ColorTokens = typeof colorTokens;
