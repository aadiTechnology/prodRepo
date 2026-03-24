/**
 * RBAC Context
 * Provides RBAC data (roles, permissions, menus) throughout the application
 */

import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from "react";
import { RBACState, LoginContextResponse } from "../types/rbac";
import { MenuNode, Feature } from "../types/menu";
import authService from "../api/services/authService";

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
  clearRBACData: () => void;
  refreshRBAC: () => Promise<void>;
}

const RBACContext = createContext<RBACContextType | undefined>(undefined);

const RBAC_STORAGE_KEY = "rbac_data";

const normalizeRole = (value: string): string => value.trim().toLowerCase();

const normalizeRoles = (roles: string[] | undefined | null): string[] => {
  if (!Array.isArray(roles)) return [];
  return Array.from(new Set(roles.map(normalizeRole).filter(Boolean)));
};

const normalizePermissions = (permissions: string[] | undefined | null): string[] => {
  if (!Array.isArray(permissions)) return [];
  return Array.from(new Set(permissions.filter(Boolean)));
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
      permissions: normalizePermissions(parsed.permissions),
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
  // FALLBACK: If backend doesn't provide granular codes, we can still derive basic view permission from menus
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
  const [permissions, setPermissions] = useState<string[]>(normalizePermissions(storedData?.permissions));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived permissions (fallback/merge)
  const allPermissions = useMemo(() => {
    const derived = extractPermissions(menus);
    // Combine backend permissions with derived ones to be safe
    return Array.from(new Set([...permissions, ...derived]));
  }, [permissions, menus]);

  /**
   * Set RBAC data (called after login)
   */
  const setRBACData = useCallback((data: Pick<LoginContextResponse, "roles" | "menus" | "permissions">) => {
    const normalizedRoles = normalizeRoles(data.roles);
    const normalizedPerms = normalizePermissions(data.permissions);
    
    setRoles(normalizedRoles);
    setMenus(data.menus);
    setPermissions(normalizedPerms);
    
    saveRBACData({ 
      roles: normalizedRoles, 
      menus: data.menus,
      permissions: normalizedPerms 
    });
    setError(null);
  }, []);

  const clearRBACData = useCallback(() => {
    setRoles([]);
    setMenus([]);
    setPermissions([]);
    clearStoredRBACData();
    setError(null);
  }, []);

  /**
   * Refresh RBAC data from backend (Hot Refresh)
   */
  const refreshRBAC = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await authService.getRBACContext();
      setRBACData(data);
    } catch (err: any) {
      const msg = err.message || "Failed to refresh permissions";
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [setRBACData]);

  /**
   * Check if user has specific permission
   */
  const hasPermission = useCallback(
    (permission: string): boolean => {
      // Direct match or partial match for case-insensitive features
      return allPermissions.includes(permission);
    },
    [allPermissions]
  );

  /**
   * Check if user has any of the specified permissions
   */
  const hasAnyPermission = useCallback(
    (permissionList: string[]): boolean => {
      return permissionList.some((perm) => allPermissions.includes(perm));
    },
    [allPermissions]
  );

  /**
   * Check if user has all of the specified permissions
   */
  const hasAllPermissions = useCallback(
    (permissionList: string[]): boolean => {
      return permissionList.every((perm) => allPermissions.includes(perm));
    },
    [allPermissions]
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
      permissions: allPermissions,
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
      clearRBACData,
      refreshRBAC,
    }),
    [
      roles,
      allPermissions,
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
      clearRBACData,
      refreshRBAC,
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
