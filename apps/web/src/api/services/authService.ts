/**
 * Authentication Service - API client for user authentication & authorization
 * Handles login, logout, user info, and RBAC context retrieval
 * Supports user impersonation for system administrators
 */

import apiClient from "../client";
import { LoginRequest, TokenResponse, User } from "../../types/auth";
import { LoginContextResponse } from "../../types/rbac";
import { getRefreshToken } from "../../utils/authStorage";
import { refreshTokenPairSingleFlight } from "../tokenRefresh";

// ═══════════════════════════════════════════════════════════════════════════
// Authentication Service - Core methods
// ═══════════════════════════════════════════════════════════════════════════
export const authService = {
  /**
   * Login user and get access token
   */
  login: async (credentials: LoginRequest): Promise<TokenResponse> => {
    const response = await apiClient.post<TokenResponse>("/auth/login", credentials);
    return response.data;
  },

  /**
   * Login user and get access token with RBAC context (roles, menus, permissions)
   */
  loginWithContext: async (credentials: LoginRequest): Promise<LoginContextResponse> => {
    const response = await apiClient.post<LoginContextResponse>("/auth/login/context", credentials);
    return response.data;
  },

  /**
   * Get current authenticated user information
   */
  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<User>("/auth/me");
    return response.data;
  },

  /**
   * Logout user (invalidate session/token on backend)
   */
  logout: async (): Promise<void> => {
    const refreshToken = await getRefreshToken();
    await apiClient.post("/auth/logout", refreshToken ? { refresh_token: refreshToken } : {});
  },

  /**
   * Impersonate a user (system admin only)
   */
  impersonate: async (userId: number): Promise<LoginContextResponse> => {
    const response = await apiClient.post<LoginContextResponse>(`/auth/impersonate/${userId}`);
    return response.data;
  },

  /**
   * Exit impersonation and return to system admin session
   */
  exitImpersonation: async (): Promise<LoginContextResponse> => {
    const response = await apiClient.post<LoginContextResponse>("/auth/exit-impersonation");
    return response.data;
  },

  /**
   * Get current user's RBAC context (roles, menus, permissions)
   */
  getRBACContext: async (): Promise<LoginContextResponse> => {
    const response = await apiClient.get<LoginContextResponse>("/auth/rbac/context");
    return response.data;
  },

  /**
   * Extend session with a new access token (single-flight with 401 interceptor).
   */
  refreshAccessToken: async (): Promise<TokenResponse> => {
    const pair = await refreshTokenPairSingleFlight();
    if (!pair?.access_token) {
      throw new Error("Token refresh failed");
    }
    return {
      access_token: pair.access_token,
      token_type: "bearer",
      refresh_token: pair.refresh_token,
    };
  },
};

export default authService;
