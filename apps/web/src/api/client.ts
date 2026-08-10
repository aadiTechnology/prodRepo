/**
 * Axios API Client
 * Centralized HTTP client with interceptors and error handling
 */

import axios, { AxiosInstance, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from "axios";
import { apiBaseUrl, isDevelopment } from "../config";
import { refreshAccessToken } from "./tokenRefresh";
import {
  clearAuthSessionStorage,
  getAccessTokenSync,
} from "../utils/authStorage";

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

const AUTH_NO_REFRESH_PATHS = [
  "/auth/login",
  "/auth/login/context",
  "/auth/register",
  "/auth/refresh",
  "/auth/logout",
];

function shouldAttemptTokenRefresh(config: InternalAxiosRequestConfig | undefined): boolean {
  const url = config?.url ?? "";
  return !AUTH_NO_REFRESH_PATHS.some((path) => url.includes(path));
}

async function forceSessionExpiredLogout(): Promise<void> {
  await clearAuthSessionStorage();
  const currentPath = window.location.pathname;
  if (currentPath !== "/login" && currentPath !== "/session-expired") {
    window.location.href = "/session-expired";
  }
}

/**
 * Custom error interface for API errors
 */
export interface ApiErrorResponse {
  detail?: string;
  message?: string;
  errors?: Record<string, string[]>;
  [key: string]: unknown;
}

/**
 * Extended Axios error with typed error response
 */
export interface ApiError extends AxiosError<ApiErrorResponse> {
  response?: AxiosResponse<ApiErrorResponse>;
}

/**
 * Create and configure axios instance
 */
const createAxiosInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: apiBaseUrl,
    timeout: 30000, // 30 seconds
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  // Request interceptor
  instance.interceptors.request.use(
    (config) => {
      // Let the browser set multipart boundary for file uploads
      if (typeof FormData !== "undefined" && config.data instanceof FormData) {
        const headers = config.headers;
        if (headers && typeof (headers as { delete?: (name: string) => void }).delete === "function") {
          (headers as { delete: (name: string) => void }).delete("Content-Type");
        } else if (headers) {
          delete (headers as Record<string, unknown>)["Content-Type"];
          delete (headers as Record<string, unknown>)["content-type"];
        }
      }

      // Log request in development
      if (isDevelopment) {
        console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
          data: config.data,
          params: config.params,
        });
      }

      // Add auth token from storage
      const token = getAccessTokenSync();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    },
    (error: AxiosError) => {
      if (isDevelopment) {
        console.error("[API Request Error]", error);
      }
      return Promise.reject(error);
    }
  );

  // Response interceptor
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      // Log response in development
      if (isDevelopment) {
        console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
          status: response.status,
          data: response.data,
        });
      }
      return response;
    },
    async (error: AxiosError<ApiErrorResponse>) => {
      // Log error in development
      if (isDevelopment) {
        console.error("[API Response Error]", {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
      }

      // Handle different error scenarios
      if (error.response) {
        const originalConfig = error.config as RetriableConfig | undefined;

        if (
          error.response.status === 401 &&
          originalConfig &&
          !originalConfig._retry &&
          shouldAttemptTokenRefresh(originalConfig)
        ) {
          originalConfig._retry = true;
          const newToken = await refreshAccessToken();
          if (newToken) {
            originalConfig.headers = originalConfig.headers ?? {};
            originalConfig.headers.Authorization = `Bearer ${newToken}`;
            return instance(originalConfig);
          }
          await forceSessionExpiredLogout();
        } else if (error.response.status === 401 && shouldAttemptTokenRefresh(originalConfig)) {
          await forceSessionExpiredLogout();
        }

        // Server responded with error status
        const errorData = error.response.data || {};
        const pydanticIssues = Array.isArray(errorData.errors) ? errorData.errors : null;
        const firstIssueMsg =
          pydanticIssues?.[0] && typeof pydanticIssues[0] === "object"
            ? String((pydanticIssues[0] as { msg?: string }).msg ?? "")
            : "";
        const errorMessage =
          (typeof errorData.detail === "string" && errorData.detail !== "Validation error"
            ? errorData.detail
            : firstIssueMsg) ||
          errorData.detail ||
          errorData.message ||
          `Request failed with status ${error.response.status}`;

        // Create a standardized error object
        const apiError: ApiError = {
          ...error,
          message: errorMessage,
        };

        return Promise.reject(apiError);
      } else if (error.request) {
        // Request made but no response received (network error)
        const networkError: ApiError = {
          ...error,
          message: "Network error. Please check your connection and try again.",
        };
        return Promise.reject(networkError);
      } else {
        // Something else happened
        return Promise.reject(error);
      }
    }
  );

  return instance;
};

// Export singleton instance
export const apiClient = createAxiosInstance();

// Export default for backward compatibility
export default apiClient;
