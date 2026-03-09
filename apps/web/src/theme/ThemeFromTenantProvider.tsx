/**
 * Bridges tenant configuration (from auth) to AppThemeProvider.
 * Renders AppThemeProvider with token overrides and/or tenant config so the correct
 * theme is applied for the logged-in tenant. When not logged in or tenant has no
 * template, default theme is used.
 *
 * Must be rendered inside AuthProvider.
 */

import { ReactNode, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import AppThemeProvider from "./AppThemeProvider";
import type { TenantThemeConfig } from "./tenant";
import type { ThemeConfigTokenOverrides } from "../types/auth";

function deriveThemeProps(tenant: { theme_config?: ThemeConfigTokenOverrides | null; logo_url?: string | null } | null | undefined) {
  if (!tenant) {
    return { tenantConfig: null, tokenOverrides: null, logoUrl: null };
  }
  const logoUrl = tenant.logo_url ?? null;
  if (tenant.theme_config != null && Object.keys(tenant.theme_config).length > 0) {
    return {
      tenantConfig: null,
      tokenOverrides: tenant.theme_config,
      logoUrl,
    };
  }
  const tenantConfig: TenantThemeConfig | null = logoUrl ? { logo: logoUrl } : null;
  return { tenantConfig, tokenOverrides: null, logoUrl };
}

interface ThemeFromTenantProviderProps {
  children: ReactNode;
}

export default function ThemeFromTenantProvider({ children }: ThemeFromTenantProviderProps) {
  const { user } = useAuth();
  const tenant = user?.tenant;

  const { tenantConfig, tokenOverrides, logoUrl } = useMemo(
    () => deriveThemeProps(tenant),
    [tenant]
  );

  return (
    <AppThemeProvider
      tenantConfig={tenantConfig}
      tokenOverrides={tokenOverrides}
      logoUrl={logoUrl}
    >
      {children}
    </AppThemeProvider>
  );
}
