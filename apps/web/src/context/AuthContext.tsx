/**
 * Authentication Context - Global authentication state management
 * Provides user login, logout, token management, and RBAC context integration
 * Manages token persistence and user session across application
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import { User, LoginRequest, AuthState } from "../types/auth";
import authService from "../api/services/authService";
import { ApiError } from "../api/client";
import { AUTH_TOKEN_REFRESHED_EVENT } from "../api/tokenRefresh";
import { LoginContextResponse } from "../types/rbac";
import { useNavigate } from "react-router-dom";
import { useRBAC } from "./RBACContext";
import { enqueueSnackbar } from "notistack";
import { getJwtExpiryMs } from "../utils/jwt";
import { recordUserLogin } from "../utils/lastLoginStorage";
import { clearAiChatSession } from "../api/services/aiChatService";
import { isNativePlatform } from "../utils/capacitor";
import {
  USER_STORAGE_KEY,
  clearAuthSessionStorage,
  getAccessTokenSync,
  persistTokenPair,
  setAccessTokenSync,
} from "../utils/authStorage";

// ═══════════════════════════════════════════════════════════════════════════
// Type Definitions
// ═══════════════════════════════════════════════════════════════════════════
interface AuthContextType extends AuthState {
  login: (credentials: LoginRequest) => Promise<void>;
  loginWithContext: (credentials: LoginRequest) => Promise<LoginContextResponse>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  exitImpersonation: () => Promise<void>;
  applyLoginContextResponse: (response: LoginContextResponse) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
/** Refresh JWT this many ms before `exp` so the session does not hit 401 mid-work. */
const TOKEN_REFRESH_BEFORE_EXPIRY_MS = 2 * 60 * 1000;

/** After auth, post cached FCM token if native push already registered. */
function syncPushDeviceTokenAfterAuth(): void {
  if (!isNativePlatform()) return;
  void import("../services/pushNotificationService")
    .then(({ syncDeviceTokenWithBackend }) =>
      syncDeviceTokenWithBackend({ force: true }),
    )
    .catch((error) => {
      console.error("[Auth] Push device token sync failed:", error);
    });
}

/**
 * Get user from localStorage
 */
const getStoredUser = (): User | null => {
  try {
    const userStr = localStorage.getItem(USER_STORAGE_KEY);
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
};

/**
 * Save user to localStorage
 */
const saveUser = (user: User): void => {
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } catch (error) {
    console.error("Failed to save user:", error);
  }
};

async function persistAuthTokens(accessToken: string, refreshToken?: string | null): Promise<void> {
  await persistTokenPair(accessToken, refreshToken);
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(getStoredUser());
  const [token, setToken] = useState<string | null>(getAccessTokenSync());
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { clearRBACData, setRBACData } = useRBAC();
  const [logoutLoading, setLogoutLoading] = useState(false);

  // Memoize isAuthenticated to prevent unnecessary recalculations
  const isAuthenticated = useMemo(() => !!token && !!user, [token, user]);

  /**
   * Refresh current user information from API
   */
  const refreshUser = useCallback(async () => {
    if (!token && !getAccessTokenSync()) return;

    try {
      const userData = await authService.getCurrentUser();
      setUser(userData);
      saveUser(userData);
    } catch (error) {
      console.error("Failed to refresh user:", error);
      // If token is invalid, logout
      if ((error as ApiError).response?.status === 401) {
        await clearAuthSessionStorage();
        setToken(null);
        setUser(null);
      }
    }
  }, [token]);

  /**
   * Login user (legacy method - uses basic login)
   */
  const login = useCallback(async (credentials: LoginRequest) => {
    try {
      setIsLoading(true);
      const tokenResponse = await authService.login(credentials);

      setToken(tokenResponse.access_token);
      await persistAuthTokens(tokenResponse.access_token, tokenResponse.refresh_token);

      const userData = await authService.getCurrentUser();
      recordUserLogin(userData.id);
      setUser(userData);
      saveUser(userData);
      syncPushDeviceTokenAfterAuth();
    } catch (error) {
      await clearAuthSessionStorage();
      setToken(null);
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Login user with RBAC context (recommended)
   * Fetches access_token, user profile, and all RBAC data (roles/menus) in a single request.
   */
  const loginWithContext = useCallback(async (credentials: LoginRequest): Promise<LoginContextResponse> => {
    try {
      setIsLoading(true);
      const response = await authService.loginWithContext(credentials);

      setToken(response.access_token);
      await persistAuthTokens(response.access_token, response.refresh_token);

      const userWithExtras = {
        ...response.user,
        tenant: response.tenant || response.user.tenant,
        profile_image_path: response.user.profile_image_path
      };

      recordUserLogin(userWithExtras.id);

      setUser(userWithExtras);
      saveUser(userWithExtras);

      setRBACData({
        roles: response.roles,
        menus: response.menus,
        permissions: response.permissions,
        rbac_version: response.rbac_version ?? null,
      });

      await clearAiChatSession();
      syncPushDeviceTokenAfterAuth();

      return response;
    } catch (error) {
      await clearAuthSessionStorage();
      setToken(null);
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [setRBACData]);

  const applyLoginContextResponse = useCallback((response: LoginContextResponse) => {
    setToken(response.access_token);
    void persistAuthTokens(response.access_token, response.refresh_token);

    const userWithExtras = {
      ...response.user,
      tenant: response.tenant || response.user.tenant,
      profile_image_path: response.user.profile_image_path
    };

    recordUserLogin(userWithExtras.id);

    setUser(userWithExtras);
    saveUser(userWithExtras);
    setRBACData({
      roles: response.roles,
      menus: response.menus,
      permissions: response.permissions,
      rbac_version: response.rbac_version ?? null,
    });
    void clearAiChatSession();
    syncPushDeviceTokenAfterAuth();
  }, [setRBACData]);

  /**
   * Logout user (calls API, clears storage, resets context, navigates)
   */
  const logout = useCallback(async (isTimeout: boolean = false) => {
    setLogoutLoading(true);
    try {
      await clearAiChatSession();
      if (!isTimeout) {
        await authService.logout();
      }
    } catch (error) {
      // Ignore API errors, proceed to clear session
    } finally {
      await clearAuthSessionStorage();
      clearRBACData();
      setToken(null);
      setUser(null);
      setLogoutLoading(false);

      if (isTimeout) {
        window.location.href = "/session-expired";
      } else {
        navigate("/login", { replace: true });
        enqueueSnackbar("You have been logged out successfully.", { variant: "success" });
      }
    }
  }, [clearRBACData, navigate]);

  /**
   * Exit impersonation and return to system admin session
   */
  const exitImpersonation = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await authService.exitImpersonation();
      applyLoginContextResponse(response);

      enqueueSnackbar("Returned to system admin view", { variant: "success" });
      navigate("/tenants");
    } catch (error) {
      console.error("Failed to exit impersonation:", error);
      enqueueSnackbar("Failed to exit tenant view", { variant: "error" });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [applyLoginContextResponse, navigate]);

  /** Keep access token fresh while the user is active. */
  useEffect(() => {
    if (!token) return;

    const scheduleRefresh = () => {
      const expMs = getJwtExpiryMs(token);
      if (!expMs) return undefined;
      const delay = Math.max(expMs - Date.now() - TOKEN_REFRESH_BEFORE_EXPIRY_MS, 30_000);
      return window.setTimeout(async () => {
        try {
          const tokens = await authService.refreshAccessToken();
          setToken(tokens.access_token);
          await persistAuthTokens(tokens.access_token, tokens.refresh_token);
        } catch {
          /* 401 handled by api client; ignore transient errors */
        }
      }, delay);
    };

    let timeoutId = scheduleRefresh();

    const onTokenRefreshed = (event: Event) => {
      const detail = (event as CustomEvent<{ access_token?: string; refresh_token?: string | null }>).detail;
      if (detail?.access_token) {
        setToken(detail.access_token);
        setAccessTokenSync(detail.access_token);
      }
    };

    window.addEventListener(AUTH_TOKEN_REFRESHED_EVENT, onTokenRefreshed);

    // On mobile, refresh when app returns to foreground in case access JWT expired in background.
    let removeAppListener: (() => void) | undefined;
    if (isNativePlatform()) {
      void import("@capacitor/app").then(({ App }) => {
        const handler = App.addListener("appStateChange", ({ isActive }) => {
          if (!isActive) return;
          void authService.refreshAccessToken()
            .then(async (tokens) => {
              setToken(tokens.access_token);
              await persistAuthTokens(tokens.access_token, tokens.refresh_token);
            })
            .catch(() => {
              /* ignore; next API 401 will force login if refresh truly expired */
            });
        });
        void handler.then((h) => {
          removeAppListener = () => {
            void h.remove();
          };
        });
      });
    }

    return () => {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      window.removeEventListener(AUTH_TOKEN_REFRESHED_EVENT, onTokenRefreshed);
      removeAppListener?.();
    };
  }, [token]);

  /**
   * Handle session timeout after inactivity
   * On native mobile, long refresh-token sessions should not be killed by idle timer
   * after the app is backgrounded — inactivity timeout remains for browser only.
   */
  useEffect(() => {
    if (isNativePlatform()) {
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);

      const currentPath = window.location.pathname;
      if (isAuthenticated && currentPath !== "/login" && currentPath !== "/session-expired") {
        timeoutId = setTimeout(() => {
          console.log("Session timed out due to inactivity");
          logout(true);
        }, INACTIVITY_TIMEOUT_MS);
      }
    };

    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];

    if (isAuthenticated) {
      events.forEach((event) => {
        window.addEventListener(event, resetTimer);
      });
      resetTimer();
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [isAuthenticated, logout]);

  // Initialize: verify token (refresh if needed) and fetch user on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = getAccessTokenSync();
      const storedUser = getStoredUser();

      const hydrateFromRefresh = async (): Promise<boolean> => {
        try {
          const { refreshTokenPair } = await import("../api/tokenRefresh");
          const pair = await refreshTokenPair();
          if (!pair?.access_token) return false;
          setToken(pair.access_token);
          const userData = await authService.getCurrentUser();
          setUser(userData);
          saveUser(userData);
          return true;
        } catch {
          return false;
        }
      };

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(storedUser);

        try {
          // getCurrentUser goes through 401 interceptor which will use refresh token if needed
          await refreshUser();
        } catch {
          const recovered = await hydrateFromRefresh();
          if (!recovered) {
            await clearAuthSessionStorage();
            setToken(null);
            setUser(null);
          }
        }
      } else {
        // Partial storage or cold reopen: recover via long-lived refresh token when present.
        const recovered = await hydrateFromRefresh();
        if (!recovered) {
          if (storedToken || storedUser) {
            await clearAuthSessionStorage();
          }
          setToken(null);
          setUser(null);
        }
      }

      setIsLoading(false);
    };

    initializeAuth();
    // Run once on mount; refreshUser identity is not needed as a dep for init.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Memoize context value to prevent unnecessary re-renders of consumers
  const value: AuthContextType = useMemo(
    () => ({
      user,
      token,
      isAuthenticated,
      isLoading,
      login,
      loginWithContext,
      logout,
      logoutLoading,
      refreshUser,
      exitImpersonation,
      applyLoginContextResponse,
    }),
    [user, token, isAuthenticated, isLoading, login, loginWithContext, logout, logoutLoading, refreshUser, exitImpersonation, applyLoginContextResponse]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use authentication context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
