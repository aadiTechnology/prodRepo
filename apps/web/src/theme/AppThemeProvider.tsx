/**
 * Theme Provider Integration (Phase 4)
 * Phase 10 — Multi-Tenant Theme Engine: supports optional tenant config and template token overrides.
 *
 * Centralized wrapper that applies the token-driven MUI theme to the application.
 * Single entry point for the UI theme system.
 *
 * Flow: Tenant Config | Template Token Overrides → Theme Layer → Theme Provider → Application Components
 * When neither is provided, the default theme is used (backward compatible).
 */

import { ThemeProvider as MuiThemeProvider, CssBaseline } from "@mui/material";
import { ReactNode, useMemo } from "react";
import { createTenantTheme, createTenantThemeFromTokenOverrides } from "./tenant";
import type { TenantThemeConfig } from "./tenant";
import type { Tokens } from "../tokens";
import { TenantBrandingProvider } from "./tenant/TenantBrandingContext";

interface AppThemeProviderProps {
  children: ReactNode;
  /** Optional tenant theme configuration (primary, secondary, typography, logo). Used when no tokenOverrides. */
  tenantConfig?: TenantThemeConfig | null;
  /** Optional token overrides from Theme Template. When present, theme is built from these (tenantConfig used only for branding e.g. logo). */
  tokenOverrides?: Partial<Tokens> | Record<string, unknown> | null;
  /** Logo URL for tenant branding (can override tenantConfig?.logo when using tokenOverrides). */
  logoUrl?: string | null;
}

export default function AppThemeProvider({
  children,
  tenantConfig,
  tokenOverrides,
  logoUrl,
}: AppThemeProviderProps) {
  const theme = useMemo(() => {
    if (tokenOverrides != null && Object.keys(tokenOverrides).length > 0) {
      return createTenantThemeFromTokenOverrides(tokenOverrides);
    }
    return createTenantTheme(tenantConfig);
  }, [tenantConfig, tokenOverrides]);

  const branding = useMemo(
    () => ({ logo: logoUrl ?? tenantConfig?.logo }),
    [logoUrl, tenantConfig?.logo]
  );

  const content = (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );

  return (
    <TenantBrandingProvider branding={branding}>
      {content}
    </TenantBrandingProvider>
  );
}
