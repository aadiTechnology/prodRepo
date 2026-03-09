/**
 * Theme Build — Typography from Design Tokens
 * Maps typography tokens to MUI typography options. No hardcoded values.
 */

import type { TypographyOptions } from "@mui/material/styles/createTypography";
import type { TypographyTokens } from "../../tokens";

export function getTypographyFromTokens(typography: TypographyTokens): TypographyOptions {
  return {
    fontFamily: typography.fontFamily.primary,
    fontSize: typography.fontSize.base,
    fontWeightLight: typography.fontWeight.light,
    fontWeightRegular: typography.fontWeight.regular,
    fontWeightMedium: typography.fontWeight.medium,
    fontWeightBold: typography.fontWeight.bold,
    h1: {
      fontSize: typography.fontSize["3xl"],
      fontWeight: typography.fontWeight.medium,
      lineHeight: typography.lineHeight.tight,
      letterSpacing: typography.letterSpacing.tight,
    },
    h2: {
      fontSize: typography.fontSize["2xl"],
      fontWeight: typography.fontWeight.medium,
      lineHeight: typography.lineHeight.snug,
      letterSpacing: typography.letterSpacing.tight,
    },
    h3: {
      fontSize: typography.fontSize.xl,
      fontWeight: typography.fontWeight.medium,
      lineHeight: typography.lineHeight.normal,
      letterSpacing: typography.letterSpacing.normal,
    },
    h4: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.medium,
      lineHeight: typography.lineHeight.normal,
      letterSpacing: typography.letterSpacing.wide,
    },
    h5: {
      fontSize: typography.fontSize.md,
      fontWeight: typography.fontWeight.medium,
      lineHeight: typography.lineHeight.normal,
      letterSpacing: typography.letterSpacing.normal,
    },
    h6: {
      fontSize: typography.fontSize.md,
      fontWeight: typography.fontWeight.medium,
      lineHeight: typography.lineHeight.relaxed,
      letterSpacing: typography.letterSpacing.wide,
    },
    subtitle1: {
      fontSize: typography.fontSize.md,
      fontWeight: typography.fontWeight.regular,
      lineHeight: typography.lineHeight.loose,
      letterSpacing: typography.letterSpacing.wide,
    },
    subtitle2: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      lineHeight: typography.lineHeight.relaxed,
      letterSpacing: typography.letterSpacing.wide,
    },
    body1: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.regular,
      lineHeight: typography.lineHeight.normal,
      letterSpacing: typography.letterSpacing.wide,
    },
    body2: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.regular,
      lineHeight: typography.lineHeight.relaxed,
      letterSpacing: typography.letterSpacing.wider,
    },
    button: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      lineHeight: typography.lineHeight.loose,
      letterSpacing: typography.letterSpacing.wider,
      textTransform: "none",
    },
    caption: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.regular,
      lineHeight: typography.lineHeight.relaxed2,
      letterSpacing: typography.letterSpacing.wider,
    },
    overline: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.regular,
      lineHeight: typography.lineHeight.relaxed2,
      letterSpacing: typography.letterSpacing.widest,
      textTransform: "uppercase",
    },
  };
}
