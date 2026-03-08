/**
 * Phase 10 — Multi-Tenant Theme Engine
 * Provides tenant branding (e.g. logo) to the tree. Not part of MUI theme; for assets and copy.
 * Consume via useTenantBranding() so components stay free of tenant-specific logic.
 */

import { createContext, useContext, ReactNode } from "react";

export interface TenantBranding {
  logo?: string;
}

const defaultBranding: TenantBranding = {};

const TenantBrandingContext = createContext<TenantBranding>(defaultBranding);

export function TenantBrandingProvider({
  children,
  branding,
}: {
  children: ReactNode;
  branding: TenantBranding;
}) {
  return (
    <TenantBrandingContext.Provider value={branding}>
      {children}
    </TenantBrandingContext.Provider>
  );
}

export function useTenantBranding(): TenantBranding {
  return useContext(TenantBrandingContext);
}
