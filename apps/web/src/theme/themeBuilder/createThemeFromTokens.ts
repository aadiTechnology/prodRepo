/**
 * Theme Build — Create MUI Theme from Design Tokens
 * Single entry that builds the full theme from the token system.
 * Supports optional token override for multiple themes (e.g. tenant branding).
 */

import { createTheme, type Theme } from "@mui/material/styles";
import { tokens, type Tokens } from "../../tokens";
import { getPaletteFromTokens } from "./paletteFromTokens";
import { getTypographyFromTokens } from "./typographyFromTokens";
import { getComponentsFromTokens } from "./componentsFromTokens";
import type { ElevationTokens } from "../../tokens";

/**
 * Build MUI shadows array from elevation tokens.
 * MUI expects 26 entries; we fill 0-6 from tokens and repeat last for 7-25.
 */
function getShadowsFromTokens(elevation: ElevationTokens): Theme["shadows"] {
  const e = Object.values(elevation) as string[];
  const rest = new Array(26 - e.length).fill(e[e.length - 1]);
  return [...e, ...rest] as Theme["shadows"];
}

/**
 * Creates the Material UI theme from design tokens.
 * Pass a partial or full token override to support multiple themes (e.g. tenant-specific).
 */
export function createAppTheme(tokenOverride?: Partial<Tokens>): Theme {
  const t = tokenOverride ? { ...tokens, ...tokenOverride } : tokens;

  const palette = getPaletteFromTokens(t.colors);
  const typography = getTypographyFromTokens(t.typography);
  const shadows = getShadowsFromTokens(t.elevation.tokens);

  const baseTheme = createTheme({
    palette,
    typography,
    spacing: t.spacing.base,
    shape: {
      borderRadius: t.radius.semantic.input,
    },
    breakpoints: {
      values: { ...t.breakpoints.values },
    },
    shadows,
  });

  const components = getComponentsFromTokens(baseTheme, {
    radius: t.radius,
    elevation: t.elevation.semantic,
    spacing: t.spacing,
  });

  return createTheme({
    ...baseTheme,
    components,
  });
}

/** Default application theme (token-driven). */
export const appTheme = createAppTheme();
