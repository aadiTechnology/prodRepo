/**
 * Platform-aware auth token storage.
 *
 * Access tokens stay in localStorage (short-lived, needed sync by axios interceptors).
 * Refresh tokens use Capacitor Preferences on native (not WebView localStorage) and
 * localStorage on web browser.
 */

import { Preferences } from "@capacitor/preferences";
import { isNativePlatform } from "./capacitor";

export const ACCESS_TOKEN_KEY = "auth_token";
export const REFRESH_TOKEN_KEY = "auth_refresh_token";
export const USER_STORAGE_KEY = "auth_user";

export function getAccessTokenSync(): string | null {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAccessTokenSync(token: string): void {
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } catch (error) {
    console.error("Failed to save access token:", error);
  }
}

export function clearAccessTokenSync(): void {
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export async function getRefreshToken(): Promise<string | null> {
  try {
    if (isNativePlatform()) {
      const { value } = await Preferences.get({ key: REFRESH_TOKEN_KEY });
      return value;
    }
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setRefreshToken(token: string): Promise<void> {
  try {
    if (isNativePlatform()) {
      await Preferences.set({ key: REFRESH_TOKEN_KEY, value: token });
      // Ensure any legacy web-storage copy is not left behind on native.
      try {
        localStorage.removeItem(REFRESH_TOKEN_KEY);
      } catch {
        /* ignore */
      }
      return;
    }
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  } catch (error) {
    console.error("Failed to save refresh token:", error);
  }
}

export async function clearRefreshToken(): Promise<void> {
  try {
    if (isNativePlatform()) {
      await Preferences.remove({ key: REFRESH_TOKEN_KEY });
    }
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export async function clearAuthSessionStorage(): Promise<void> {
  clearAccessTokenSync();
  try {
    localStorage.removeItem(USER_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  await clearRefreshToken();
}

/** Persist both tokens from a login/refresh response (refresh optional for legacy). */
export async function persistTokenPair(accessToken: string, refreshToken?: string | null): Promise<void> {
  setAccessTokenSync(accessToken);
  if (refreshToken) {
    await setRefreshToken(refreshToken);
  }
}
