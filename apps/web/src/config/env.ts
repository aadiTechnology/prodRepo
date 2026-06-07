/// <reference types="vite/client" />

import { isNativePlatform } from "../utils/capacitor";

/**
 * Environment configuration
 * Provides type-safe access to environment variables
 */

interface EnvConfig {
  apiBaseUrl: string;
  appName: string;
  appVersion: string;
  isDevelopment: boolean;
  isProduction: boolean;
  isNative: boolean;
}

const PRODUCTION_API_FALLBACK = "https://preschoolapi.aaditechnology.com";
const DEV_API_FALLBACK = "http://127.0.0.1:8000";

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function resolveApiBaseUrl(mode: string): string {
  const configured = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (configured?.trim()) {
    return normalizeBaseUrl(configured.trim());
  }

  if (mode === "production" || isNativePlatform()) {
    return PRODUCTION_API_FALLBACK;
  }

  return DEV_API_FALLBACK;
}

/**
 * Get environment configuration
 * Validates required environment variables and provides defaults
 */
export const getEnvConfig = (): EnvConfig => {
  const mode = import.meta.env.MODE || "development";
  const apiBaseUrl = resolveApiBaseUrl(mode);
  const appName = import.meta.env.VITE_APP_NAME || "Preschool ERP";
  const appVersion = import.meta.env.VITE_APP_VERSION || "1.0.0";

  try {
    new URL(apiBaseUrl);
  } catch {
    console.warn(
      `Invalid API base URL format: ${apiBaseUrl}. Using default: ${DEV_API_FALLBACK}`,
    );
  }

  return {
    apiBaseUrl,
    appName,
    appVersion,
    isDevelopment: mode === "development",
    isProduction: mode === "production",
    isNative: isNativePlatform(),
  };
};

// Export singleton instance
export const env = getEnvConfig();

// Export individual values for convenience
export const { apiBaseUrl, appName, appVersion, isDevelopment, isProduction, isNative } = env;
