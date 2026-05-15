/**
 * Axios API Client
 * Centralized HTTP client with interceptors and error handling
 */

import axios, { AxiosInstance, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from "axios";
import { apiBaseUrl, isDevelopment } from "../config";
import { refreshAccessToken } from "./tokenRefresh";

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

let refreshInFlight: Promise<string | null> | null = null;

function tryRefreshToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = refreshAccessToken().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

function forceSessionExpiredLogout(): void {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_user");
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
      // Log request in development
      if (isDevelopment) {
        console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
          data: config.data,
          params: config.params,
        });
      }

      // Add auth token from localStorage
      const token = localStorage.getItem("auth_token");
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
          const newToken = await tryRefreshToken();
          if (newToken) {
            originalConfig.headers = originalConfig.headers ?? {};
            originalConfig.headers.Authorization = `Bearer ${newToken}`;
            return instance(originalConfig);
          }
          forceSessionExpiredLogout();
        } else if (error.response.status === 401 && shouldAttemptTokenRefresh(originalConfig)) {
          forceSessionExpiredLogout();
        }

        // Server responded with error status
        const errorData = error.response.data || {};
        const errorMessage =
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
