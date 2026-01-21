/**
 * Authentication Service
 * Handles authentication API calls
 */

import apiClient from "../client";
import { LoginRequest, TokenResponse, User } from "../../types/auth";

export const authService = {
  /**
   * Login user and get access token
   */
  login: async (credentials: LoginRequest): Promise<TokenResponse> => {
    const response = await apiClient.post<TokenResponse>("/auth/login", credentials);
    return response.data;
  },

  /**
   * Get current authenticated user information
   */
  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<User>("/auth/me");
    return response.data;
  },
};

export default authService;
