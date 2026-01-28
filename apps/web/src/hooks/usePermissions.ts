/**
 * usePermissions Hook
 * Convenience hook for permission checking
 * Provides easy access to permission checking utilities
 */

import { useRBAC } from "../context/RBACContext";

/**
 * Hook for permission checking utilities
 *
 * @example
 * const { hasPermission, hasAnyPermission, permissions } = usePermissions();
 *
 * if (hasPermission('USER_EDIT')) {
 *   // Show edit button
 * }
 */
export function usePermissions() {
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    permissions,
  } = useRBAC();

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    permissions,
  };
}
