/**
 * Refresh access token without going through the main apiClient 401 handler loop.
 * Prefers long-lived refresh tokens; falls back to legacy bearer sliding refresh
 * when a refresh token is not available (legacy web sessions).
 *
 * All refresh entry points (401 interceptor, proactive timer, app resume) must use
 * {@link refreshTokenPairSingleFlight} so concurrent calls share one request.
 */

import axios from "axios";
import { apiBaseUrl } from "../config";
import {
  getAccessTokenSync,
  getRefreshToken,
  persistTokenPair,
  setAccessTokenSync,
} from "../utils/authStorage";

export const AUTH_TOKEN_REFRESHED_EVENT = "auth:token-refreshed";

export type TokenRefreshResult = {
  access_token: string;
  refresh_token?: string | null;
};

function dispatchTokenRefreshed(result: TokenRefreshResult): void {
  window.dispatchEvent(
    new CustomEvent(AUTH_TOKEN_REFRESHED_EVENT, {
      detail: {
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      },
    }),
  );
}

/**
 * Exchange refresh token (or legacy valid access token) for a new access token.
 * Prefer {@link refreshTokenPairSingleFlight} when callers may race.
 */
export async function refreshAccessToken(): Promise<string | null> {
  const result = await refreshTokenPairSingleFlight();
  return result?.access_token ?? null;
}

async function doRefreshTokenPair(): Promise<TokenRefreshResult | null> {
  const refreshToken = await getRefreshToken();
  const accessToken = getAccessTokenSync();

  try {
    if (refreshToken) {
      const response = await axios.post<{ access_token: string; refresh_token?: string }>(
        `${apiBaseUrl}/auth/refresh`,
        { refresh_token: refreshToken },
        { timeout: 30000 },
      );
      const newAccess = response.data?.access_token;
      if (!newAccess) return null;

      const newRefresh = response.data?.refresh_token ?? null;
      await persistTokenPair(newAccess, newRefresh);
      const result: TokenRefreshResult = {
        access_token: newAccess,
        refresh_token: newRefresh,
      };
      dispatchTokenRefreshed(result);
      return result;
    }

    // Legacy: sliding refresh requires a still-valid access JWT
    if (!accessToken) return null;

    const response = await axios.post<{ access_token: string; refresh_token?: string }>(
      `${apiBaseUrl}/auth/refresh`,
      {},
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 30000,
      },
    );
    const newAccess = response.data?.access_token;
    if (!newAccess) return null;

    setAccessTokenSync(newAccess);
    if (response.data?.refresh_token) {
      await persistTokenPair(newAccess, response.data.refresh_token);
    }

    const result: TokenRefreshResult = {
      access_token: newAccess,
      refresh_token: response.data?.refresh_token,
    };
    dispatchTokenRefreshed(result);
    return result;
  } catch {
    return null;
  }
}

let refreshInFlight: Promise<TokenRefreshResult | null> | null = null;

/** Single-flight token refresh used by 401 interceptor and proactive refresh. */
export function refreshTokenPairSingleFlight(): Promise<TokenRefreshResult | null> {
  if (!refreshInFlight) {
    refreshInFlight = doRefreshTokenPair().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

/** @deprecated Prefer {@link refreshTokenPairSingleFlight}; kept for call-site clarity. */
export async function refreshTokenPair(): Promise<TokenRefreshResult | null> {
  return refreshTokenPairSingleFlight();
}
