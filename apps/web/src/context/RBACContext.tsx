/**
 * RBAC Context
 * Provides RBAC data (roles, permissions, menus) throughout the application
 */

import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from "react";
import { RBACState, LoginContextResponse } from "../types/rbac";
import { MenuNode, Feature } from "../types/menu";

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
  setRBACData: (data: Pick<LoginContextResponse, "roles" | "menus">) => void;
  clearRBACData: () => void;
}

const RBACContext = createContext<RBACContextType | undefined>(undefined);

const RBAC_STORAGE_KEY = "rbac_data";

/**
 * Get RBAC data from localStorage
 */
const getStoredRBACData = (): Pick<RBACState, "roles" | "menus"> | null => {
  try {
    const rbacStr = localStorage.getItem(RBAC_STORAGE_KEY);
    return rbacStr ? JSON.parse(rbacStr) : null;
  } catch {
    return null;
  }
};

/**
 * Save RBAC data to localStorage
 */
const saveRBACData = (data: Pick<RBACState, "roles" | "menus">): void => {
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
    menu.features.forEach((feature) => {
      permissions.add(feature.code);
    });
    
    if (menu.children) {
      menu.children.forEach(traverseMenu);
    }
  };
  
  menus.forEach(traverseMenu);
  return Array.from(permissions);
};

interface RBACProviderProps {
  children: ReactNode;
}

export function RBACProvider({ children }: RBACProviderProps) {
  const storedData = getStoredRBACData();
  
  const [roles, setRoles] = useState<string[]>(storedData?.roles || []);
  const [menus, setMenus] = useState<MenuNode[]>(storedData?.menus || []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract permissions from menus
  const permissions = useMemo(() => extractPermissions(menus), [menus]);

  /**
   * Set RBAC data (called after login)
   */
  const setRBACData = useCallback((data: Pick<LoginContextResponse, "roles" | "menus">) => {
    setRoles(data.roles);
    setMenus(data.menus);
    saveRBACData({ roles: data.roles, menus: data.menus });
    setError(null);
  }, []);

  /**
   * Clear RBAC data (called on logout)
   */
  const clearRBACData = useCallback(() => {
    setRoles([]);
    setMenus([]);
    clearStoredRBACData();
    setError(null);
  }, []);

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
      return roles.includes(role);
    },
    [roles]
  );

  /**
   * Check if user has any of the specified roles
   */
  const hasAnyRole = useCallback(
    (roleList: string[]): boolean => {
      return roleList.some((role) => roles.includes(role));
    },
    [roles]
  );

  /**
   * Check if user has all of the specified roles
   */
  const hasAllRoles = useCallback(
    (roleList: string[]): boolean => {
      return roleList.every((role) => roles.includes(role));
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
