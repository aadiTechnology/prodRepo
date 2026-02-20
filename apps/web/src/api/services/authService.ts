/**
 * Authentication Service
 * Handles authentication API calls
 */

import apiClient from "../client";
import { LoginRequest, TokenResponse, User } from "../../types/auth";
import { LoginContextResponse } from "../../types/rbac";

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
    await apiClient.post("/auth/logout");
  },
};

export default authService;
