/**
 * Theme Provider Integration (Phase 4)
 * Phase 10 — Multi-Tenant Theme Engine: supports optional tenant config.
 *
 * Centralized wrapper that applies the token-driven MUI theme to the application.
 * Single entry point for the UI theme system.
 *
 * Flow: Tenant Config (optional) → Token Overrides → Theme Layer → Theme Provider → Application Components
 * When no tenant config is provided, the default theme is used (backward compatible).
 */

import { ThemeProvider as MuiThemeProvider, CssBaseline } from "@mui/material";
import { ReactNode, useMemo } from "react";
import { createTenantTheme } from "./tenant";
import type { TenantThemeConfig } from "./tenant";
import { TenantBrandingProvider } from "./tenant/TenantBrandingContext";

interface AppThemeProviderProps {
  children: ReactNode;
  /** Optional tenant theme configuration. When absent, default theme is used. */
  tenantConfig?: TenantThemeConfig | null;
}

export default function AppThemeProvider({
  children,
  tenantConfig,
}: AppThemeProviderProps) {
  const theme = useMemo(
    () => createTenantTheme(tenantConfig),
    [tenantConfig]
  );

  const branding = useMemo(
    () => ({ logo: tenantConfig?.logo }),
    [tenantConfig?.logo]
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
