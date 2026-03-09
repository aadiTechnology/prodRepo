/**
 * Theme Build — Component Overrides from Design Tokens
 * MUI component style overrides driven by tokens (radius, elevation).
 * Uses theme for palette so overrides stay consistent with token-derived theme.
 */

import type { Components, Theme } from "@mui/material/styles";
import type { RadiusTokens, RadiusSemantic, ElevationSemantic, SpacingTokens } from "../../tokens";

export interface ComponentsFromTokensOptions {
  radius: { tokens: RadiusTokens; semantic: RadiusSemantic };
  elevation: ElevationSemantic;
  spacing: { tokens: SpacingTokens };
}

export function getComponentsFromTokens(
  theme: Theme,
  options: ComponentsFromTokensOptions
): Components<Theme> {
  const { radius, elevation, spacing } = options;
  const r = radius.semantic;
  const rTokens = radius.tokens;
  const scrollbarSize = spacing.tokens.sm;

  return {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: r.button,
          textTransform: "none",
          fontWeight: theme.typography.fontWeightMedium,
        },
        contained: {
          boxShadow: elevation.card,
          "&:hover": {
            boxShadow: elevation.cardHover,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: r.card,
          boxShadow: elevation.card,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: r.input,
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: r.dialog,
          boxShadow: elevation.dialog,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: elevation.card,
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: "thin",
          scrollbarColor: `${theme.palette.grey[400]} ${theme.palette.background.paper}`,
          "&::-webkit-scrollbar": {
            width: scrollbarSize,
          },
          "&::-webkit-scrollbar-track": {
            background: theme.palette.background.paper,
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: theme.palette.grey[400],
            borderRadius: rTokens.sm,
            "&:hover": {
              backgroundColor: theme.palette.grey[500],
            },
          },
        },
      },
    },
  };
}
