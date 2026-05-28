/**
 * RBAC Context - Role-Based Access Control state management
 * Provides role checking, permission validation, and menu utilities
 * Manages roles, permissions, and menu hierarchy for the entire application
 */

import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode, useRef } from "react";
import { RBACState, LoginContextResponse } from "../types/rbac";
import { MenuNode, Feature } from "../types/menu";
import { authService } from "../api/services/authService";
import { useEffect } from "react";

const AUTH_TOKEN_KEY = "auth_token";
const RBAC_POLL_INTERVAL_MS = 5_000;

// ═══════════════════════════════════════════════════════════════════════════
// Type Definitions - RBAC Context interface and methods
// ═══════════════════════════════════════════════════════════════════════════
interface RBACContextType extends RBACState {
  // Permission checking
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  
  // Role checking
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasAllRoles: (roles: string[]) => boolean;
  
  // Menu utilities
  getMenuByPath: (path: string) => MenuNode | null;
  getMenuFeatures: (menuId: number) => Feature[];
  
  // Actions
  setRBACData: (data: Pick<LoginContextResponse, "roles" | "menus" | "permissions"> & { rbac_version?: string | null }) => void;
  refreshRBAC: () => Promise<void>;
  clearRBACData: () => void;

  /** Version string reported by backend; changes whenever effective RBAC changes. */
  rbacVersion: string | null;
  grantedMenuPaths: Set<string>;
  /** True once RBAC data has been initialized from storage or backend. */
  isInitialized: boolean;
}

const RBACContext = createContext<RBACContextType | undefined>(undefined);

const RBAC_STORAGE_KEY = "rbac_data";
const RBAC_VERSION_STORAGE_KEY = "rbac_version";

const normalizeRole = (value: string): string => value.trim().toLowerCase();

const normalizeRoles = (roles: string[] | undefined | null): string[] => {
  if (!Array.isArray(roles)) return [];
  // de-dupe after normalization
  return Array.from(new Set(roles.map(normalizeRole).filter(Boolean)));
};

/**
 * Get RBAC data from localStorage
 */
const getStoredRBACData = (): Pick<RBACState, "roles" | "menus" | "permissions"> | null => {
  try {
    const rbacStr = localStorage.getItem(RBAC_STORAGE_KEY);
    const parsed = rbacStr ? JSON.parse(rbacStr) : null;
    if (!parsed) return null;
    return {
      ...parsed,
      roles: normalizeRoles(parsed.roles),
    };
  } catch {
    return null;
  }
};

/**
 * Save RBAC data to localStorage
 */
const saveRBACData = (data: Pick<RBACState, "roles" | "menus" | "permissions">): void => {
  try {
    localStorage.setItem(RBAC_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save RBAC data:", error);
  }
};

/**
 * Clear RBAC data from localStorage
 */
const clearStoredRBACData = (): void => {
  try {
    localStorage.removeItem(RBAC_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear RBAC data:", error);
  }
};

/**
 * Extract permissions from menus (flatten features)
 */
const extractPermissions = (menus: MenuNode[]): string[] => {
  const permissions = new Set<string>();
  
  const traverseMenu = (menu: MenuNode) => {
    if (menu.features && Array.isArray(menu.features)) {
      menu.features.forEach((feature) => {
        if (feature && feature.code) {
          permissions.add(feature.code);
        }
      });
    }
    
    if (menu.children) {
      menu.children.forEach(traverseMenu);
    }
  };
  
  if (Array.isArray(menus)) {
    menus.forEach(traverseMenu);
  }
  return Array.from(permissions);
};

const extractMenuPaths = (menus: MenuNode[]): Set<string> => {
  const paths = new Set<string>();
  const traverse = (node: MenuNode) => {
    if (node.path) paths.add(node.path);
    if (node.children) node.children.forEach(traverse);
  };
  menus.forEach(traverse);
  return paths;
};

interface RBACProviderProps {
  children: ReactNode;
}

export function RBACProvider({ children }: RBACProviderProps) {
  const storedData = getStoredRBACData();
  
  const [roles, setRoles] = useState<string[]>(normalizeRoles(storedData?.roles));
  const [menus, setMenus] = useState<MenuNode[]>(storedData?.menus || []);
  const [permissions, setPermissions] = useState<string[]>(storedData?.permissions || []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rbacVersion, setRbacVersion] = useState<string | null>(() => {
    try {
      return localStorage.getItem(RBAC_VERSION_STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [isInitialized, setIsInitialized] = useState<boolean>(Boolean(storedData));

  const grantedMenuPaths = useMemo(
    () => extractMenuPaths(menus),
    [menus]
  );

  // Latest version seen by polling; ref so the interval closure always sees it.
  const rbacVersionRef = useRef<string | null>(rbacVersion);
  // Deduplicate overlapping refresh calls from poll/visibility/mount triggers.
  const refreshInFlightRef = useRef<Promise<void> | null>(null);
  useEffect(() => {
    rbacVersionRef.current = rbacVersion;
  }, [rbacVersion]);

  /**
   * Set RBAC data (called after login)
   */
  const setRBACData = useCallback(
    (
      data: Pick<LoginContextResponse, "roles" | "menus" | "permissions"> & {
        rbac_version?: string | null;
      }
    ) => {
      const normalized = normalizeRoles(data.roles);
      const effectivePermissions = data.permissions?.length
        ? data.permissions
        : extractPermissions(data.menus);
      setRoles(normalized);
      setMenus(data.menus);
      setPermissions(effectivePermissions);
      saveRBACData({ roles: normalized, menus: data.menus, permissions: effectivePermissions });
      if (data.rbac_version !== undefined) {
        const nextVersion = data.rbac_version ?? null;
        setRbacVersion(nextVersion);
        try {
          if (nextVersion) localStorage.setItem(RBAC_VERSION_STORAGE_KEY, nextVersion);
          else localStorage.removeItem(RBAC_VERSION_STORAGE_KEY);
        } catch {
          // non-fatal
        }
      }
      setIsInitialized(true);
      setError(null);
    },
    []
  );

  /**
   * Clear RBAC data (called on logout)
   */
  const clearRBACData = useCallback(() => {
    setRoles([]);
    setMenus([]);
    setPermissions([]);
    setRbacVersion(null);
    clearStoredRBACData();
    try {
      localStorage.removeItem(RBAC_VERSION_STORAGE_KEY);
    } catch {
      // non-fatal
    }
    setError(null);
  }, []);

  /**
   * Refresh RBAC data from backend. If the server-reported rbac_version has
   * not changed since the last refresh we skip replacing state, keeping
   * identity stable for memoized consumers (e.g. the Sidebar).
   */
  const refreshRBAC = useCallback(async () => {
    if (refreshInFlightRef.current) {
      await refreshInFlightRef.current;
      return;
    }

    const run = (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await authService.getRBACContext();
        const nextVersion = data.rbac_version ?? null;

        if (nextVersion && rbacVersionRef.current && nextVersion === rbacVersionRef.current) {
          return;
        }

        const normalized = normalizeRoles(data.roles);
        const effectivePermissions = data.permissions?.length
          ? data.permissions
          : extractPermissions(data.menus);
        setRoles(normalized);
        setMenus(data.menus);
        setPermissions(effectivePermissions);
        saveRBACData({ roles: normalized, menus: data.menus, permissions: effectivePermissions });
        setRbacVersion(nextVersion);
        setIsInitialized(true);
        try {
          if (nextVersion) localStorage.setItem(RBAC_VERSION_STORAGE_KEY, nextVersion);
          else localStorage.removeItem(RBAC_VERSION_STORAGE_KEY);
        } catch {
          // non-fatal
        }
      } catch (err: any) {
        console.error("Failed to refresh RBAC data:", err);
        setError(err.message || "Failed to refresh permissions");
      } finally {
        setIsLoading(false);
      }
    })();

    refreshInFlightRef.current = run;
    try {
      await run;
    } finally {
      if (refreshInFlightRef.current === run) {
        refreshInFlightRef.current = null;
      }
    }
  }, []);

  /**
   * Auto-refresh on mount when we have an auth token (rehydrate after reload).
   */
  useEffect(() => {
    const hasToken = !!localStorage.getItem(AUTH_TOKEN_KEY);
    if (hasToken) {
      refreshRBAC();
    }
  }, [refreshRBAC]);

  /**
   * Live polling so an already-logged-in user picks up permission/menu
   * changes (e.g. an admin saves a new grant) within a few seconds.
   * Gated on: tab visible + auth token present.
   */
  useEffect(() => {
    let cancelled = false;

    const shouldPoll = () =>
      !cancelled &&
      typeof document !== "undefined" &&
      document.visibilityState === "visible" &&
      !!localStorage.getItem(AUTH_TOKEN_KEY);

    const tick = () => {
      if (shouldPoll()) {
        void refreshRBAC();
      }
    };

    const interval = window.setInterval(tick, RBAC_POLL_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible" && !!localStorage.getItem(AUTH_TOKEN_KEY)) {
        void refreshRBAC();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refreshRBAC]);

  /**
   * Check if user has specific permission
   */
  const hasPermission = useCallback(
    (permission: string): boolean => {
      return permissions.includes(permission);
    },
    [permissions]
  );

  /**
   * Check if user has any of the specified permissions
   */
  const hasAnyPermission = useCallback(
    (permissionList: string[]): boolean => {
      return permissionList.some((perm) => permissions.includes(perm));
    },
    [permissions]
  );

  /**
   * Check if user has all of the specified permissions
   */
  const hasAllPermissions = useCallback(
    (permissionList: string[]): boolean => {
      return permissionList.every((perm) => permissions.includes(perm));
    },
    [permissions]
  );

  /**
   * Check if user has specific role
   */
  const hasRole = useCallback(
    (role: string): boolean => {
      return roles.includes(normalizeRole(role));
    },
    [roles]
  );

  /**
   * Check if user has any of the specified roles
   */
  const hasAnyRole = useCallback(
    (roleList: string[]): boolean => {
      return roleList.some((role) => roles.includes(normalizeRole(role)));
    },
    [roles]
  );

  /**
   * Check if user has all of the specified roles
   */
  const hasAllRoles = useCallback(
    (roleList: string[]): boolean => {
      return roleList.every((role) => roles.includes(normalizeRole(role)));
    },
    [roles]
  );

  /**
   * Get menu by path
   */
  const getMenuByPath = useCallback(
    (path: string): MenuNode | null => {
      const findMenu = (menuList: MenuNode[]): MenuNode | null => {
        for (const menu of menuList) {
          if (menu.path === path) {
            return menu;
          }
          if (menu.children) {
            const found = findMenu(menu.children);
            if (found) return found;
          }
        }
        return null;
      };
      
      return findMenu(menus);
    },
    [menus]
  );

  /**
   * Get features for a specific menu
   */
  const getMenuFeatures = useCallback(
    (menuId: number): Feature[] => {
      const findMenu = (menuList: MenuNode[]): MenuNode | null => {
        for (const menu of menuList) {
          if (menu.id === menuId) {
            return menu;
          }
          if (menu.children) {
            const found = findMenu(menu.children);
            if (found) return found;
          }
        }
        return null;
      };
      
      const menu = findMenu(menus);
      return menu?.features || [];
    },
    [menus]
  );

  // OPTIMIZATION: Memoize permission checking methods separately to prevent thrashing
  // When roles change, permission checkers don't need to update
  const permissionMethods = useMemo(
    () => ({
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
    }),
    [hasPermission, hasAnyPermission, hasAllPermissions]
  );

  // OPTIMIZATION: Memoize role checking methods separately
  const roleMethods = useMemo(
    () => ({
      hasRole,
      hasAnyRole,
      hasAllRoles,
    }),
    [hasRole, hasAnyRole, hasAllRoles]
  );

  // OPTIMIZATION: Memoize menu utilities separately
  const menuMethods = useMemo(
    () => ({
      getMenuByPath,
      getMenuFeatures,
    }),
    [getMenuByPath, getMenuFeatures]
  );

  // OPTIMIZATION: Memoize action methods separately
  const actionMethods = useMemo(
    () => ({
      setRBACData,
      refreshRBAC,
      clearRBACData,
    }),
    [setRBACData, refreshRBAC, clearRBACData]
  );

  // OPTIMIZATION: Memoize state separately to prevent unnecessary re-renders
  const state = useMemo(
    () => ({
      roles,
      permissions,
      menus,
      isLoading,
      error,
      rbacVersion,
      grantedMenuPaths,
      isInitialized,
    }),
    [roles, permissions, menus, isLoading, error, rbacVersion, grantedMenuPaths, isInitialized]
  );

  const value: RBACContextType = useMemo(
    () => ({
      ...state,
      ...permissionMethods,
      ...roleMethods,
      ...menuMethods,
      ...actionMethods,
    }),
    [state, permissionMethods, roleMethods, menuMethods, actionMethods]
  );

  return <RBACContext.Provider value={value}>{children}</RBACContext.Provider>;
}

/**
 * Hook to use RBAC context
 */
export function useRBAC(): RBACContextType {
  const context = useContext(RBACContext);
  if (context === undefined) {
    throw new Error("useRBAC must be used within an RBACProvider");
  }
  return context;
}
