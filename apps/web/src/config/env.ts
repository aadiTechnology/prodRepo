/// <reference types="vite/client" />

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
}

/**
 * Get environment configuration
 * Validates required environment variables and provides defaults
 */
export const getEnvConfig = (): EnvConfig => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
  const appName = import.meta.env.VITE_APP_NAME || "Production MUI App";
  const appVersion = import.meta.env.VITE_APP_VERSION || "1.0.0";
  const mode = import.meta.env.MODE || "development";

  // Validate API URL format
  try {
    new URL(apiBaseUrl);
  } catch {
    console.warn(
      `Invalid API base URL format: ${apiBaseUrl}. Using default: http://127.0.0.1:8000`
    );
  }

  return {
    apiBaseUrl,
    appName,
    appVersion,
    isDevelopment: mode === "development",
    isProduction: mode === "production",
  };
};

// Export singleton instance
export const env = getEnvConfig();

// Export individual values for convenience
export const { apiBaseUrl, appName, appVersion, isDevelopment, isProduction } = env;
