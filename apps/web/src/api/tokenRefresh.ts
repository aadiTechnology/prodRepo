/**
 * Refresh access token without going through the main apiClient 401 handler loop.
 */

import axios from "axios";
import { apiBaseUrl } from "../config";

const TOKEN_STORAGE_KEY = "auth_token";

export const AUTH_TOKEN_REFRESHED_EVENT = "auth:token-refreshed";

export async function refreshAccessToken(): Promise<string | null> {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!token) return null;

  try {
    const response = await axios.post<{ access_token: string }>(
      `${apiBaseUrl}/auth/refresh`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000,
      },
    );
    const newToken = response.data?.access_token;
    if (!newToken) return null;

    localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
    window.dispatchEvent(
      new CustomEvent(AUTH_TOKEN_REFRESHED_EVENT, { detail: { access_token: newToken } }),
    );
    return newToken;
  } catch {
    return null;
  }
}
