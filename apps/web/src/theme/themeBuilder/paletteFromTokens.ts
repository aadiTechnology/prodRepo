/**
 * Theme Build — Palette from Design Tokens
 * Maps color tokens to MUI palette. No hardcoded values.
 */

import type { PaletteOptions } from "@mui/material/styles";
import type { ColorTokens } from "../../tokens";

export function getPaletteFromTokens(colors: ColorTokens): PaletteOptions {
  return {
    mode: "light",
    primary: {
      main: colors.primary.main,
      light: colors.primary.light,
      dark: colors.primary.dark,
      contrastText: colors.primary.contrast,
    },
    secondary: {
      main: colors.secondary.main,
      light: colors.secondary.light,
      dark: colors.secondary.dark,
      contrastText: colors.secondary.contrast,
    },
    error: {
      main: colors.error.main,
      light: colors.error.light,
      dark: colors.error.dark,
      contrastText: colors.error.contrast,
    },
    warning: {
      main: colors.warning.main,
      light: colors.warning.light,
      dark: colors.warning.dark,
      contrastText: colors.warning.contrast,
    },
    info: {
      main: colors.info.main,
      light: colors.info.light,
      dark: colors.info.dark,
      contrastText: colors.info.contrast,
    },
    success: {
      main: colors.success.main,
      light: colors.success.light,
      dark: colors.success.dark,
      contrastText: colors.success.contrast,
    },
    background: {
      default: colors.background.default,
      paper: colors.background.paper,
    },
    text: {
      primary: colors.text.primary,
      secondary: colors.text.secondary,
      disabled: colors.text.disabled,
    },
    divider: colors.divider,
    grey: {
      50: colors.gray[50],
      100: colors.gray[100],
      200: colors.gray[200],
      300: colors.gray[300],
      400: colors.gray[400],
      500: colors.gray[500],
      600: colors.gray[600],
      700: colors.gray[700],
      800: colors.gray[800],
      900: colors.gray[900],
    },
  };
}
