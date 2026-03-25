/**
 * RBAC Context - Role-Based Access Control state management
 * Provides role checking, permission validation, and menu utilities
 * Manages roles, permissions, and menu hierarchy for the entire application
 */

import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from "react";
import { RBACState, LoginContextResponse } from "../types/rbac";
import { MenuNode, Feature } from "../types/menu";
import { authService } from "../api/services/authService";
import { useEffect } from "react";

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
  setRBACData: (data: Pick<LoginContextResponse, "roles" | "menus" | "permissions">) => void;
  refreshRBAC: () => Promise<void>;
  clearRBACData: () => void;
}

const RBACContext = createContext<RBACContextType | undefined>(undefined);

const RBAC_STORAGE_KEY = "rbac_data";

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

  /**
   * Set RBAC data (called after login)
   */
  const setRBACData = useCallback((data: Pick<LoginContextResponse, "roles" | "menus" | "permissions">) => {
    const normalized = normalizeRoles(data.roles);
    const effectivePermissions = data.permissions?.length ? data.permissions : extractPermissions(data.menus);
    setRoles(normalized);
    setMenus(data.menus);
    setPermissions(effectivePermissions);
    saveRBACData({ roles: normalized, menus: data.menus, permissions: effectivePermissions });
    setError(null);
  }, []);

  /**
   * Clear RBAC data (called on logout)
   */
  const clearRBACData = useCallback(() => {
    setRoles([]);
    setMenus([]);
    setPermissions([]);
    clearStoredRBACData();
    setError(null);
  }, []);

  /**
   * Refresh RBAC data from backend
   */
  const refreshRBAC = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await authService.getRBACContext();
      const normalized = normalizeRoles(data.roles);
      const effectivePermissions = data.permissions?.length ? data.permissions : extractPermissions(data.menus);
      setRoles(normalized);
      setMenus(data.menus);
      setPermissions(effectivePermissions);
      saveRBACData({ roles: normalized, menus: data.menus, permissions: effectivePermissions });
    } catch (err: any) {
      console.error("Failed to refresh RBAC data:", err);
      setError(err.message || "Failed to refresh permissions");
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Auto-refresh on mount if we have stored data (meaning we are likely logged in)
   */
  useEffect(() => {
    const hasToken = !!localStorage.getItem("token"); // Assuming token is stored in localStorage
    if (hasToken) {
      refreshRBAC();
    }
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

  const value: RBACContextType = useMemo(
    () => ({
      roles,
      permissions,
      menus,
      isLoading,
      error,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      hasRole,
      hasAnyRole,
      hasAllRoles,
      getMenuByPath,
      getMenuFeatures,
      setRBACData,
      refreshRBAC,
      clearRBACData,
    }),
    [
      roles,
      permissions,
      menus,
      isLoading,
      error,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      hasRole,
      hasAnyRole,
      hasAllRoles,
      getMenuByPath,
      getMenuFeatures,
      setRBACData,
      refreshRBAC,
      clearRBACData,
    ]
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
