/**
 * Axios API Client
 * Centralized HTTP client with interceptors and error handling
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from "axios";
import { apiBaseUrl, isDevelopment } from "../config";

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
    (error: AxiosError<ApiErrorResponse>) => {
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
        // Handle 401 Unauthorized - clear auth and redirect to login
        if (error.response.status === 401) {
          // Clear authentication data
          localStorage.removeItem("auth_token");
          localStorage.removeItem("auth_user");
          
          // Only redirect if not already on login page
          if (window.location.pathname !== "/login") {
            window.location.href = "/login";
          }
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
