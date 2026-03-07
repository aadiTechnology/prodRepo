/**
 * Design Tokens — Single Source of Truth
 *
 * Centralized token system for:
 * - Theme layer (future phase)
 * - Reusable UI components
 * - Consistent layouts
 * - Multi-tenant theming
 *
 * Import from "@/tokens" or "tokens" (with path alias).
 * Do not hardcode styling values; reference these tokens.
 */

export { colorTokens } from "./colors";
export type { ColorTokens } from "./colors";

export {
  spacingBase,
  spacingScale,
  spacingTokens,
} from "./spacing";
export type { SpacingScale, SpacingTokens } from "./spacing";

export { typographyTokens } from "./typography";
export type { TypographyTokens } from "./typography";

export { radiusTokens, radiusSemantic } from "./radius";
export type { RadiusTokens, RadiusSemantic } from "./radius";

export { elevationTokens, elevationSemantic } from "./elevation";
export type { ElevationTokens, ElevationSemantic } from "./elevation";

export {
  breakpointTokens,
  breakpointMin,
  breakpointMax,
} from "./breakpoints";
export type { BreakpointTokens } from "./breakpoints";

import { colorTokens } from "./colors";
import {
  spacingBase,
  spacingScale,
  spacingTokens,
} from "./spacing";
import { typographyTokens } from "./typography";
import { radiusTokens, radiusSemantic } from "./radius";
import { elevationTokens, elevationSemantic } from "./elevation";
import {
  breakpointTokens,
  breakpointMin,
  breakpointMax,
} from "./breakpoints";

/**
 * Aggregate tokens object for theme builders and tenant overrides.
 * Enables: const theme = buildTheme(tokens) or buildTheme({ ...tokens, colors: tenantColors }).
 */
export const tokens = {
  colors: colorTokens,
  spacing: {
    base: spacingBase,
    scale: spacingScale,
    tokens: spacingTokens,
  },
  typography: typographyTokens,
  radius: {
    tokens: radiusTokens,
    semantic: radiusSemantic,
  },
  elevation: {
    tokens: elevationTokens,
    semantic: elevationSemantic,
  },
  breakpoints: {
    values: breakpointTokens,
    min: breakpointMin,
    max: breakpointMax,
  },
} as const;

export type Tokens = typeof tokens;
