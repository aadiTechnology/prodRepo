/**
 * Authentication Context
 * Provides authentication state and methods throughout the application
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { User, LoginRequest, AuthState } from "../types/auth";
import authService from "../api/services/authService";
import { ApiError } from "../api/client";

interface AuthContextType extends AuthState {
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_STORAGE_KEY = "auth_token";
const USER_STORAGE_KEY = "auth_user";

/**
 * Get token from localStorage
 */
const getStoredToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
};

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
 * Save token to localStorage
 */
const saveToken = (token: string): void => {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch (error) {
    console.error("Failed to save token:", error);
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

/**
 * Clear authentication data from localStorage
 */
const clearAuthData = (): void => {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear auth data:", error);
  }
};

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(getStoredUser());
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!token && !!user;

  /**
   * Refresh current user information from API
   */
  const refreshUser = useCallback(async () => {
    if (!token) return;

    try {
      const userData = await authService.getCurrentUser();
      setUser(userData);
      saveUser(userData);
    } catch (error) {
      console.error("Failed to refresh user:", error);
      // If token is invalid, logout
      if ((error as ApiError).response?.status === 401) {
        clearAuthData();
        setToken(null);
        setUser(null);
      }
    }
  }, [token]);

  /**
   * Login user
   */
  const login = useCallback(async (credentials: LoginRequest) => {
    try {
      setIsLoading(true);
      const tokenResponse = await authService.login(credentials);
      
      // Save token
      setToken(tokenResponse.access_token);
      saveToken(tokenResponse.access_token);

      // Fetch user information
      const userData = await authService.getCurrentUser();
      setUser(userData);
      saveUser(userData);
    } catch (error) {
      clearAuthData();
      setToken(null);
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Logout user
   */
  const logout = useCallback(() => {
    clearAuthData();
    setToken(null);
    setUser(null);
  }, []);

  // Initialize: verify token and fetch user on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = getStoredToken();
      const storedUser = getStoredUser();

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(storedUser);
        
        // Verify token is still valid by fetching current user
        try {
          await refreshUser();
        } catch {
          // Token invalid, clear auth data
          clearAuthData();
          setToken(null);
          setUser(null);
        }
      }
      
      setIsLoading(false);
    };

    initializeAuth();
  }, [refreshUser]);

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshUser,
  };

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
